# traxo-backend

API REST de Traxo. Gestiona la autenticación de usuarios, el historial de consultas SPEI y actúa de intermediario hacia el microservicio Python que hace scraping de Banxico.

---

## Tecnologías

| Herramienta | Versión | Rol |
|---|---|---|
| Spring Boot | 3.4.2 | Framework principal |
| Java | 21 | Lenguaje (records, virtual threads) |
| Spring Security | 6.x | Autenticación y autorización |
| JJWT | 0.12.6 | Generación y validación de JWT |
| Spring Data JPA + Hibernate | 6.x | Persistencia ORM |
| PostgreSQL | 16 | Base de datos relacional |
| Flyway | 10.x | Migraciones de esquema versionadas |
| Spring WebFlux (`WebClient`) | 6.x | Cliente HTTP reactivo para llamar al microservicio |
| Spring Actuator | built-in | Endpoint `/api/actuator/health` para health checks |
| BCrypt | built-in | Hash de contraseñas |
| Maven | 3.9 | Build y gestión de dependencias |

---

## Rol en el monorepo

El backend es el único componente que conoce la base de datos y es el único que el frontend puede contactar. El microservicio Python (`traxo-micros`) no es accesible públicamente — solo el backend lo llama, desde dentro de la red Docker, con una API key compartida.

```
traxo-frontend  →  traxo-backend (:8080)
                        ├─► PostgreSQL (:5432)
                        └─► traxo-micros (:3000)  [red interna Docker]
```

---

## Arquitectura hexagonal

El backend usa **arquitectura hexagonal** (también llamada Ports & Adapters). A diferencia de la arquitectura por capas tradicional, el dominio no depende de nada externo: ni de la base de datos, ni del framework web, ni del cliente HTTP.

### Comparación con arquitectura por capas

**Por capas (tradicional):**
```
API (controladores)
  └─► Negocio (servicios, DTOs)
        └─► Persistencia (entidades JPA, DAOs, repositorios Spring)
```
El problema es que el negocio importa directamente clases de JPA (`@Entity`, `EntityManager`). Si mañana se cambia PostgreSQL por MongoDB, hay que modificar la capa de negocio. Si se cambia el framework HTTP, los servicios conocen `HttpServletRequest`. Las capas se acoplan hacia abajo.

**Hexagonal (Ports & Adapters):**
```
Dominio (modelos puros, interfaces de puertos)
  ▲                 ▲
  │                 │
Adaptador entrada   Adaptador salida
(controladores,     (repositorios JPA,
 Spring MVC)        clientes HTTP)
```
El dominio define **lo que necesita** (interfaces), sin saber **cómo se implementa**. Los adaptadores implementan esas interfaces. El dominio nunca importa Spring, JPA ni ninguna biblioteca externa.

### Beneficios concretos en este proyecto

- **Testabilidad**: se puede probar `RegistrarUsuario` con un repositorio en memoria sin necesitar base de datos.
- **Intercambiabilidad**: cambiar PostgreSQL por otro motor solo requiere reescribir `UsuarioRepositoryAdapter`, sin tocar la lógica de negocio.
- **Claridad de responsabilidades**: el dominio expresa reglas de negocio en Java puro. Los controladores solo traducen HTTP ↔ dominio.

---

## Estructura de archivos

```
src/main/java/mx/traxo/
│
├── dominio/                          # Núcleo de la aplicación. Sin dependencias externas.
│   ├── modelo/
│   │   ├── Usuario.java              # record: id, nombre, email, contrasenaHash, activo, creadoEn
│   │   ├── Consulta.java             # record: id, idUsuario, fechas, monto, bancos, estado, alias, concepto
│   │   ├── ResultadoRastreo.java     # record: resultado devuelto por Banxico (no se persiste completo)
│   │   └── EstadoTransferencia.java  # enum: LIQUIDADA, RECHAZADA, EN_PROCESO, NO_ENCONTRADA
│   │
│   └── puerto/
│       ├── entrada/                  # Interfaces que el dominio expone (casos de uso)
│       │   ├── RegistrarUsuarioCasoUso.java
│       │   ├── AutenticarUsuarioCasoUso.java
│       │   ├── RastrearSpeiCasoUso.java
│       │   ├── GuardarConsultaCasoUso.java
│       │   ├── ObtenerHistorialCasoUso.java
│       │   ├── EliminarConsultaCasoUso.java
│       │   └── ActualizarPerfilCasoUso.java
│       └── salida/                   # Interfaces que el dominio requiere (repositorios, gateways)
│           ├── UsuarioRepository.java   # buscarPorEmail, buscarPorId, guardar, eliminar, existePorEmail
│           ├── ConsultaRepository.java  # guardar, buscarPorUsuario, eliminar, eliminarPorUsuario
│           ├── TokenGateway.java        # generarToken, extraerIdUsuario, validarToken
│           └── SpeiGateway.java         # rastrear, obtenerBancos
│
├── aplicacion/
│   └── casos/                        # Implementaciones de los puertos de entrada (lógica de negocio)
│       ├── RegistrarUsuario.java      # Valida email único, hashea contraseña, persiste
│       ├── AutenticarUsuario.java     # Verifica credenciales, genera JWT
│       ├── RastrearSpei.java          # Delega al SpeiGateway (micros), no persiste
│       ├── GuardarConsulta.java       # Persiste el resultado del rastreo en historial
│       ├── ObtenerHistorial.java      # Devuelve consultas del usuario, ordenadas por fecha
│       ├── EliminarConsulta.java      # Valida pertenencia al usuario antes de borrar
│       └── ActualizarPerfil.java      # Obtener perfil, cambiar nombre/contraseña, eliminar cuenta
│
├── infraestructura/
│   ├── persistencia/                 # Adaptadores de salida: base de datos
│   │   ├── UsuarioEntidad.java        # @Entity JPA mapeada a tabla `usuarios`
│   │   ├── UsuarioJpaRepository.java  # extends JpaRepository — Spring Data
│   │   ├── UsuarioRepositoryAdapter.java  # implements UsuarioRepository (puerto de salida)
│   │   ├── ConsultaEntidad.java       # @Entity JPA mapeada a tabla `consultas`
│   │   ├── ConsultaJpaRepository.java
│   │   └── ConsultaRepositoryAdapter.java
│   │
│   ├── cliente/                      # Adaptadores de salida: servicios externos
│   │   ├── JwtTokenGateway.java       # implements TokenGateway — genera/valida JWT con JJWT
│   │   ├── SpeiGatewayAdapter.java    # implements SpeiGateway — llama a traxo-micros con WebClient
│   │   ├── TurnstileService.java      # Verifica tokens de Cloudflare Turnstile contra la API de Cloudflare
│   │   └── FiltroLogRestApi.java      # Log de peticiones salientes al microservicio
│   │
│   └── web/                          # Adaptadores de entrada: HTTP
│       ├── AutenticacionController.java
│       ├── RastreoController.java
│       ├── HistorialController.java
│       ├── PerfilController.java
│       ├── BancosController.java
│       └── dto/                      # DTOs de request/response (solo en capa web)
│           ├── RegistroRequestDto.java
│           ├── LoginRequestDto.java
│           ├── TokenResponseDto.java
│           ├── RastreoRequestDto.java
│           ├── RastreoResponseDto.java
│           ├── GuardarConsultaRequestDto.java
│           ├── ConsultaResponseDto.java
│           ├── ActualizarNombreRequestDto.java
│           └── CambiarContrasenaRequestDto.java
│
├── configuracion/
│   ├── SeguridadConfig.java          # Spring Security: cookie filter chain, CORS, rutas públicas
│   ├── FiltroJwt.java                # Lee cookie traxo_token; fallback a Bearer header para herramientas dev
│   └── ManejadorExcepciones.java     # @RestControllerAdvice — errores como ProblemDetail
│
└── TraxoApplication.java             # Entry point
```

**Relación entre pares:**

| Puerto de salida (interfaz) | Implementación (adaptador) |
|---|---|
| `UsuarioRepository` | `UsuarioRepositoryAdapter` |
| `ConsultaRepository` | `ConsultaRepositoryAdapter` |
| `TokenGateway` | `JwtTokenGateway` |
| `SpeiGateway` | `SpeiGatewayAdapter` |

| Puerto de entrada (interfaz) | Implementación (caso de uso) |
|---|---|
| `RegistrarUsuarioCasoUso` | `RegistrarUsuario` |
| `AutenticarUsuarioCasoUso` | `AutenticarUsuario` |
| `RastrearSpeiCasoUso` | `RastrearSpei` |
| `GuardarConsultaCasoUso` | `GuardarConsulta` |
| `ObtenerHistorialCasoUso` | `ObtenerHistorial` |
| `EliminarConsultaCasoUso` | `EliminarConsulta` |
| `ActualizarPerfilCasoUso` | `ActualizarPerfil` |

---

## Endpoints

Todos los endpoints tienen el prefijo `/api` (context-path en `application.yml`).

### Autenticación (`/api/auth`)

#### `POST /api/auth/registro`
Crea una nueva cuenta. No requiere token.

**Request:**
```json
{
  "nombre": "Juan",
  "email": "juan@ejemplo.com",
  "contrasena": "minimo8chars",
  "turnstileToken": "<token del widget Cloudflare Turnstile>"
}
```
`turnstileToken` es opcional en el DTO pero se valida en el backend contra la API de Cloudflare. Si `TURNSTILE_SECRET_KEY` no está configurada en el servidor, la verificación se omite (modo desarrollo).
**Response `201`:**
```json
{ "id": "uuid", "email": "juan@ejemplo.com" }
```

---

#### `POST /api/auth/login`
Autentica al usuario. No requiere token.

**Request:**
```json
{ "email": "juan@ejemplo.com", "contrasena": "minimo8chars" }
```
**Response `204`:** sin cuerpo. Establece la cookie `traxo_token` (HttpOnly, SameSite=Lax, Secure en producción). La cookie es leída automáticamente por el browser en cada request posterior.

---

#### `POST /api/auth/logout`
Cierra la sesión vaciando la cookie. No requiere autenticación (la cookie puede estar expirada).

**Response `204`:** sin cuerpo. Vacía la cookie `traxo_token` (`Max-Age: 0`).

---

### Rastreo SPEI (`/api/rastreo`)

#### `POST /api/rastreo`
Consulta el estado de una transferencia SPEI en Banxico. No requiere login (público).

**Request:**
```json
{
  "fechaOperacion": "2024-05-28",
  "monto": 1300.00,
  "claveRastreo": "MBAN01001234567890",
  "emisor": "BANCOPPEL",
  "receptor": "BANAMEX",
  "cuentaBeneficiaria": "002180700123456789",
  "datosCompletos": false
}
```
**Response `200`:**
```json
{
  "estado": "LIQUIDADA",
  "fechaOperacion": "2024-05-28",
  "horaOperacion": "15:56",
  "monto": 1300.00,
  "bancoEmisor": "BANCOPPEL",
  "bancoReceptor": "BANAMEX",
  "descripcion": "Liquidado",
  "nombreEmisor": null,
  "nombreReceptor": null,
  "concepto": null
}
```
Con `datosCompletos: true`, `nombreEmisor`, `nombreReceptor` y `concepto` se populan (requiere que la transferencia esté liquidada).

---

#### `POST /api/rastreo/ocr`
Analiza un comprobante de transferencia bancaria con OCR y devuelve los campos SPEI extraídos. No requiere login (público). `multipart/form-data`.

**Request:** campo `imagen` (JPG, PNG o WEBP, máx 10 MB).

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
Los campos en `faltantes` no pudieron leerse de la imagen; el usuario los completa manualmente. `cuentaBeneficiaria` siempre es `null` (el usuario la ingresa por seguridad).

---

#### `POST /api/rastreo/guardar`
Persiste el resultado de un rastreo en el historial del usuario. Requiere sesión activa (cookie).

Los campos sensibles (`nombreEmisor`, `nombreReceptor`) **no se persisten**, solo se usan para mostrar al usuario en sesión.

**Request:**
```json
{
  "resultado": { /* mismo objeto devuelto por POST /rastreo */ },
  "alias": "Renta mayo"
}
```
**Response `201`:** objeto `ConsultaResponseDto` (ver historial).

---

### Historial (`/api/historial`) — requiere sesión activa (cookie)

#### `GET /api/historial`
Devuelve las consultas guardadas del usuario autenticado, ordenadas de más reciente a más antigua.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "fechaConsulta": "2024-05-28T22:10:00Z",
    "fechaOperacion": "2024-05-28",
    "horaOperacion": "15:56",
    "monto": 1300.00,
    "bancoEmisor": "BANCOPPEL",
    "bancoReceptor": "BANAMEX",
    "estado": "LIQUIDADA",
    "alias": "Renta mayo",
    "concepto": "Pago mayo"
  }
]
```

---

#### `DELETE /api/historial/{id}`
Elimina una consulta del historial. Solo funciona si el `id` pertenece al usuario autenticado.

**Response `204`:** sin cuerpo.

---

### Perfil (`/api/perfil`) — requiere sesión activa (cookie)

#### `GET /api/perfil`
Devuelve el nombre y email del usuario autenticado.

**Response `200`:**
```json
{ "nombre": "Juan", "email": "juan@ejemplo.com" }
```

---

#### `PATCH /api/perfil/nombre`
Actualiza el nombre del usuario.

**Request:**
```json
{ "nombre": "Juan Carlos" }
```
**Response `200`:**
```json
{ "nombre": "Juan Carlos" }
```

---

#### `PATCH /api/perfil/contrasena`
Cambia la contraseña. Requiere la contraseña actual para confirmar.

**Request:**
```json
{ "contrasenaActual": "actual123", "contrasenaNueva": "nueva456" }
```
**Response `204`:** sin cuerpo.

---

#### `DELETE /api/perfil`
Elimina la cuenta y todo el historial del usuario (cascade).

**Response `204`:** sin cuerpo.

---

### Catálogo (`/api/bancos`)

#### `GET /api/bancos`
Devuelve la lista de bancos disponibles en Banxico. Público.

**Response `200`:**
```json
["BANCOPPEL", "BANAMEX", "BBVA MEXICO", "HSBC", ...]
```

---

### Salud

#### `GET /api/actuator/health`
Usado por Docker Compose para health checks. No expone detalles del sistema.

**Response `200`:**
```json
{ "status": "UP" }
```

---

## Manejo de errores

Todos los errores siguen el formato **ProblemDetail** (RFC 9457):

```json
{
  "type": "about:blank",
  "title": "Solicitud invalida",
  "status": 400,
  "detail": "El email ya está registrado.",
  "instance": "/api/auth/registro"
}
```

| Excepción | HTTP | Descripción |
|---|---|---|
| `IllegalArgumentException` | 400 | Error de validación de negocio |
| `MethodArgumentNotValidException` | 422 | Bean Validation fallido (campos del DTO) |
| `RuntimeException` | 500 | Error interno no contemplado |

---

## Base de datos

Las migraciones se aplican automáticamente al arrancar el backend (Flyway). No se requiere ejecutar SQL manualmente.

| Archivo | Descripción |
|---|---|
| `V1__crear_tablas_base.sql` | Tablas `usuarios` y `consultas`, enum `estado_transferencia`, índices |

Campos que **nunca se almacenan** por decisión de privacidad: CLABE, clave de rastreo, nombre del ordenante/beneficiario.

---

## Variables de entorno

| Variable | Default (local) | Descripción |
|---|---|---|
| `DB_HOST` | `localhost` | Host de PostgreSQL |
| `DB_PORT` | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | `traxo` | Nombre de la base de datos |
| `DB_USER` | `traxo` | Usuario de PostgreSQL |
| `DB_PASSWORD` | `traxo` | Contraseña de PostgreSQL |
| `JWT_SECRETO` | _(sin default, obligatorio)_ | Clave secreta para firmar JWT (mín. 32 chars) |
| `JWT_EXPIRACION_MS` | `86400000` (24 h local) | Expiración del token en ms. En producción se usa `2592000000` (30 días) vía docker-compose. |
| `TRAXO_JWT_COOKIE_SECURE` | `false` | `true` en producción (HTTPS). Con `false` la cookie funciona en HTTP (localhost). |
| `MICROS_URL` | `http://localhost:3000` | URL del microservicio Python |
| `MICROS_API_KEY` | _(vacío)_ | API key compartida con el microservicio |
| `TURNSTILE_SECRET_KEY` | _(vacío)_ | Clave secreta de Cloudflare Turnstile. Si está vacía, la verificación anti-bot en `/api/auth/registro` se omite. |

---

## Correr localmente

**Requisitos:** Java 21, Maven 3.9, PostgreSQL 16 corriendo en `localhost:5432` con una base de datos `traxo` y usuario `traxo`.

La única variable que no tiene default es `JWT_SECRETO`. Configurarla en IntelliJ en **Run/Debug Configurations → Environment variables**:

```
JWT_SECRETO=cualquier-cadena-de-al-menos-32-caracteres
```

Arrancar con Maven:

```bash
./mvnw spring-boot:run
# → http://localhost:8080/api
```

O desde IntelliJ ejecutando `TraxoApplication`.

Si PostgreSQL usa credenciales distintas a las del default, también agregar `DB_PASSWORD` (y otras que difieran) en la configuración de ejecución.
