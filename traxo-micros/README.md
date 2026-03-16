# traxo-micros

Microservicios Python de Traxo. Expone:
- Una API para rastrear transferencias SPEI consultando el portal de Banxico mediante automatización de navegador con Playwright.
- Un endpoint de OCR que analiza comprobantes bancarios y extrae los campos necesarios para el rastreo.

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688?logo=fastapi&logoColor=white)]()
[![Playwright](https://img.shields.io/badge/Playwright-1.49.1-2EAD33?logo=playwright&logoColor=white)]()
[![EasyOCR](https://img.shields.io/badge/EasyOCR-1.7.2-FF6F00?logo=opencv&logoColor=white)]()
[![Claude Haiku](https://img.shields.io/badge/Claude_Haiku-Vision-D97706?logo=anthropic&logoColor=white)]()

---

## Tecnologías

| Herramienta | Versión | Rol |
|---|---|---|
| Python | 3.12 | Lenguaje |
| FastAPI | 0.115.6 | Framework web async |
| Uvicorn | 0.34.0 | Servidor ASGI |
| Playwright | 1.49.1 | Automatización de Chromium |
| BeautifulSoup4 | 4.12.3 | Parsing de HTML |
| pandas + lxml | 2.2.3 / 5.3.0 | Parsing de XML (CEP descargado) |
| SlowAPI | 0.1.9 | Rate limiting por IP |
| Pydantic | v2 (via FastAPI) | Validación de esquemas de entrada/salida |
| EasyOCR | 1.7.2 | OCR de comprobantes (español + inglés, CPU) |
| OpenCV Headless | 4.13.0.92 | Preprocesado de imagen para OCR |
| Pillow | 12.1.1 | Redimensionado y ajuste de contraste |
| anthropic | 0.83.0 | Claude Haiku Vision para clave de rastreo |
| python-dotenv | 1.2.1 | Carga de variables de entorno desde `.env` |
| pytest + pytest-asyncio | 8.3.4 / 0.25.2 | Tests de integración |

---

## Rol en el monorepo

Este microservicio es el **único componente que accede a internet**. Hace scraping del portal de Banxico para obtener el estado de una transferencia SPEI. No tiene base de datos propia y no es accesible públicamente — solo el backend lo llama desde dentro de la red Docker.

```
Internet (Banxico)
    ▲
    │
traxo-micros (:3000)   ←── traxo-backend (red interna Docker)
```

La separación en un microservicio independiente tiene dos razones:

1. **Aislamiento de dependencias**: Playwright instala Chromium (~300 MB) y sus dependencias de sistema. Mantenerlo separado evita contaminar la imagen del backend Java.
2. **Tolerancia a fallos**: si Banxico cambia su HTML y el scraper falla, el resto de la app (historial, perfil, login) sigue funcionando sin interrupción.

---

## Arquitectura

```
app/
├── api.py                  # Aplicación FastAPI: lifespan, endpoints, seguridad, rate limiting
├── scraper_spei.py         # Lógica de scraping: interacción con Playwright y parsing
├── ocr.py                  # Pipeline OCR: preprocesado, EasyOCR, Claude Haiku Vision, parsing de campos
├── reglas_bancos.py        # Heurísticas y correcciones específicas por banco (ver REGLAS_BANCOS.md)
└── modelos/
    ├── modelos_spei.py     # Modelos Pydantic (request/response) y excepciones de dominio
    └── modelos_ocr.py      # OcrRespuesta: campos extraídos y lista de faltantes
```

### Pool de páginas

En lugar de abrir y cerrar un navegador por cada petición, el microservicio mantiene un **pool de 3 páginas de Chromium precargadas** con el formulario de Banxico ya abierto. Esto reduce drásticamente el tiempo de respuesta.

**Flujo de una petición:**

```
Request  →  toma página del pool (asyncio.Queue)
         →  rellena y envía el formulario
         →  parsea la respuesta
         →  devuelve resultado al cliente
         →  [en background] navega de vuelta al formulario para reutilizar la página
```

Si la página falla al resetearse, se crea una nueva automáticamente. El reset ocurre **después** de enviar la respuesta al cliente, sin bloquear.

**Inicialización (lifespan):**

```
Arranque:
  1. Lanza Chromium (headless)
  2. Carga el catálogo de bancos desde Banxico (una sola vez)
  3. Crea 3 páginas con el formulario precargado

Apagado:
  1. Cierra todas las páginas del pool
  2. Cierra el navegador
```

Las páginas bloquean recursos no esenciales (fuentes, imágenes, favicons) para minimizar el tiempo de carga.

### OCR de comprobantes

El endpoint `/ocr/analizar` extrae los campos SPEI de una imagen de comprobante bancario.

**Pipeline:**
```
imagen → preprocesado (escala de grises, contraste ×1.5, ancho máx 1500px)
       → EasyOCR (texto)
       → parsear_campos_spei() (regex por campo)
       → Claude Haiku Vision (solo clave de rastreo, si el banco lo requiere)
       → postprocesar_clave() (correcciones específicas por banco)
       → OcrRespuesta
```

**Campos extraídos:** `fechaOperacion`, `monto`, `claveRastreo`, `emisor`, `receptor`.
`cuentaBeneficiaria` siempre se devuelve vacía — el usuario la ingresa manualmente.

Las reglas de corrección por banco (qué bancos activan Vision, cómo corregir la clave de rastreo) están documentadas en [`REGLAS_BANCOS.md`](REGLAS_BANCOS.md).

---

## Endpoints

### `GET /health`

Health check del servicio. Reporta el estado del navegador y las páginas disponibles en el pool.

**Response `200` (operativo):**
```json
{
  "status": "ok",
  "browser": true,
  "paginas_disponibles": 3
}
```

**Response `503` (degradado):**
```json
{
  "status": "degraded",
  "browser": false,
  "paginas_disponibles": 0
}
```

---

### `GET /bancos`

Devuelve la lista de bancos disponibles en el catálogo de Banxico.

**Headers requeridos:** `x-internal-key: <MICROS_API_KEY>`

**Response `200`:**
```json
["BANCOPPEL", "BANAMEX", "BBVA MEXICO", "HSBC", ...]
```

**Response `401`:** API key inválida o ausente.

---

### `POST /rastreo-spei`

Consulta el estado de una transferencia SPEI en el portal de Banxico.

**Headers requeridos:** `x-internal-key: <MICROS_API_KEY>`

**Rate limit:** 15 peticiones por minuto por IP.

**Request:**
```json
{
  "fecha": "28/05/2024",
  "claveRastreo": "MBAN01001234567890",
  "bancoEmisor": "BANCOPPEL",
  "bancoReceptor": "BANAMEX",
  "cuentaReceptora": "002180700123456789",
  "monto": "1300.00",
  "datosCompletos": false
}
```

| Campo | Formato | Requerido |
|---|---|---|
| `fecha` | `dd/mm/yyyy` | Sí |
| `claveRastreo` | string | Sí |
| `bancoEmisor` | nombre exacto del catálogo | Sí |
| `bancoReceptor` | nombre exacto del catálogo | Sí |
| `cuentaReceptora` | número de cuenta | Sí |
| `monto` | decimal (`1300.00`) | Sí |
| `datosCompletos` | boolean | No (default: `false`) |

**Response `200` con `datosCompletos: false` (consulta básica):**
```json
{
  "tipoDatos": "Basico",
  "referencia": "9300016",
  "clave": "MBAN01001234567890",
  "emisor": "BANCOPPEL",
  "receptor": "BANAMEX",
  "estado": "Liquidado",
  "fechaRecepcion": "28/05/2024 15:56:06",
  "fechaProcesado": "28/05/2024 15:56:07",
  "cuenta": "002180700123456789",
  "monto": "1300.00",
  "horaOperacion": "15:56",
  "nombreReceptor": null,
  "nombreEmisor": null,
  "concepto": null
}
```

**Response `200` con `datosCompletos: true` (descarga XML / CEP):**

Solo disponible para transferencias liquidadas. Banxico emite el Comprobante Electrónico de Pago (CEP) en formato XML. El scraper lo descarga y parsea.

```json
{
  "tipoDatos": "Completo",
  "referencia": null,
  "clave": "MBAN01001234567890",
  "emisor": "BANCOPPEL",
  "receptor": "BANAMEX",
  "estado": "Liquidado",
  "fechaRecepcion": null,
  "fechaProcesado": "28/05/2024 15:56:07",
  "cuenta": "002180700123456789",
  "monto": "1300.00",
  "horaOperacion": "15:56",
  "nombreReceptor": "BENEFICIARIO EJEMPLO",
  "nombreEmisor": "ORDENANTE EJEMPLO",
  "concepto": "Pago de renta"
}
```

**Códigos de error:**

| Status | Descripción |
|---|---|
| `401` | API key inválida o ausente |
| `404` | Transferencia no encontrada en Banxico |
| `422` | Datos de entrada inválidos (formato de fecha, monto, etc.) |
| `429` | Rate limit excedido (15 req/min por IP) |
| `503` | Banxico no disponible o error en el scraping |

---

### `POST /ocr/analizar`

Analiza un comprobante de transferencia bancaria y extrae los campos SPEI.

**Headers requeridos:** `x-internal-key: <MICROS_API_KEY>`

**Request:** `multipart/form-data`, campo `imagen` (JPG, PNG o WEBP, máx 10 MB).

**Response `200`:**
```json
{
  "campos": {
    "fechaOperacion": "2026-02-20",
    "monto": "235.00",
    "claveRastreo": "MBAN01001234567890",
    "emisor": "BANAMEX",
    "receptor": "BBVA MEXICO",
    "cuentaBeneficiaria": null
  },
  "faltantes": ["cuentaBeneficiaria"]
}
```

| Status | Descripción |
|---|---|
| `401` | API key inválida |
| `413` | Imagen mayor a 10 MB |
| `422` | Tipo de archivo no soportado (solo JPG, PNG, WEBP) |
| `500` | Error interno al procesar la imagen |

---

## Seguridad

Las rutas `/bancos`, `/rastreo-spei` y `/ocr/analizar` requieren el header `x-internal-key` con el valor de `MICROS_API_KEY`. Si la variable no está configurada (entorno de desarrollo), la validación se omite.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `MICROS_API_KEY` | Clave compartida con el backend para autenticar peticiones internas |
| `ANTHROPIC_API_KEY` | Clave de API de Anthropic para Claude Haiku Vision. Opcional pero recomendada — mejora la lectura de la clave de rastreo en bancos como Azteca. Sin ella el OCR funciona solo con EasyOCR. |

Para tests de integración (opcionales):

| Variable | Descripción |
|---|---|
| `TRAXO_TEST_FECHA` | Fecha de la transferencia de prueba (`dd/mm/yyyy`) |
| `TRAXO_TEST_CLAVE_RASTREO` | Clave de rastreo de prueba |
| `TRAXO_TEST_BANCO_EMISOR` | Banco emisor de prueba |
| `TRAXO_TEST_BANCO_RECEPTOR` | Banco receptor de prueba |
| `TRAXO_TEST_CUENTA_RECEPTORA` | Cuenta receptora de prueba |
| `TRAXO_TEST_MONTO` | Monto de prueba (decimal) |

Copiar `.env.example` a `.env` y completar los valores.

---

## Correr localmente

**Requisitos:** Python 3.12, pip.

```bash
# Crear entorno virtual (solo la primera vez)
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Instalar Chromium para Playwright (solo la primera vez)
playwright install chromium

# Arrancar el servidor
uvicorn app.api:app --reload --host 0.0.0.0 --port 3000
# → http://localhost:3000
```

La documentación interactiva está disponible en `http://localhost:3000/docs` (Swagger UI).

---

## Tests

Los tests son de **integración** — se conectan al servicio real de Banxico. Requieren una transferencia real y reciente en las variables de entorno.

```bash
# Con el entorno virtual activado
pytest
```

Los tests incluyen una pausa de 10 segundos entre casos para respetar el rate limiting de Banxico.

---

## Build para Docker

El `Dockerfile` usa un build multi-etapa:

1. **Builder** (`python:3.12-slim`): instala dependencias Python en un virtualenv aislado.
2. **Final** (`python:3.12-slim`): instala las dependencias de sistema para Chromium, copia el virtualenv e instala el navegador con `playwright install chromium`.

La imagen resultante corre en el puerto `3000` con:

```
uvicorn app.api:app --host 0.0.0.0 --port 3000
```
