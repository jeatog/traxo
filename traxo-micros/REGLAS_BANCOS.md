# Reglas OCR por banco

Archivos relevantes: `app/reglas_bancos.py` (reglas por banco) · `app/ocr.py` (parser general).

---

## Pipeline OCR

```
imagen → EasyOCR → parsear_campos_spei() → extraer_clave_con_vision() → OcrRespuesta
                         ↓                          ↓
              reglas_bancos.py              reglas_bancos.py
          (detectar emisor, postprocesar   (debe_usar_vision,
           clave EasyOCR)                  hint_vision_por_banco,
                                           postprocesar_clave Vision)
```

**Claude Haiku Vision** es **opt-in**: solo corre para la clave de rastreo de bancos con
`usar_vision: True`. Si el banco está en `FORMATO_CLAVE` sin esa flag, Vision se omite.
Bancos no listados → Vision corre por defecto (formato desconocido, puede ayudar).

---

## Referencia rápida de bancos

| Banco | Vision | Reglas clave | Identificador exclusivo |
|-------|--------|-------------|------------------------|
| AZTECA | ✓ | `cuerpo_numerico` + `ultimo_char_letra` | `"guardadito"` |
| BBVA | — | — | — |
| BANAMEX | — | — | — |
| BANORTE | — | — | — |
| Desconocido | ✓ default | — | — |

---

## Detalle por banco

### AZTECA

- **Identificador**: `"guardadito"` (aparece en "Guardadito Digital ***0777"). Detectado por
  `detectar_banco_por_contexto` antes de llamar a Vision, lo que permite enviar el hint correcto.
- **Formato de clave**: dígitos + **letra de verificación `I` al final**.
  Tanto EasyOCR como Claude Vision confunden `I` ↔ `1` en la tipografía de Azteca.
- **Por qué Vision está activa**: EasyOCR leía sistemáticamente `'1'` en el último char.
  Vision con el hint contextual lo resuelve mejor; la regla `ultimo_char_letra` es el safety net.
- **Por qué `cuerpo_numerico`**: en pruebas reales Vision leyó `'s'` en lugar de `'5'` en
  el cuerpo numérico. La regla convierte `s→5`, `O→0`, `I/i/l→1`, `B→8`, `Z→2`.
- **Hint en prompt Vision**: le indica que la clave termina con letra `I`, no con dígito.

### BBVA

- **Formato de clave**: prefijo alfabético (`MBAN…`) + dígitos.
- **Por qué Vision está desactivada**: `_normalizar_clave_rastreo()` en EasyOCR ya resuelve
  `O→0` e `I→1` en el prefijo. En pruebas reales Vision devolvió `MBAN0100…1…I…` —
  convirtió dígitos `'1'` a `'I'` en el cuerpo numérico, empeorando el resultado.

### BANAMEX / BANORTE

- Clave puramente numérica o alfanumérica sin lugar a ambigüedad. EasyOCR la lee bien; Vision desactivada.

---

## Cómo agregar un banco nuevo

1. **Tiene identificador exclusivo** (nombre de cuenta/producto único en el comprobante):
   ```python
   # app/reglas_bancos.py
   IDENTIFICADORES_BANCO = {
       'AZTECA': ['guardadito'],
       'MI_BANCO': ['nombre-exclusivo'],
   }
   ```

2. **Necesita Vision** (clave con caracteres ambiguos que EasyOCR no resuelve):
   Agregar a `FORMATO_CLAVE` con `usar_vision: True` y las reglas que apliquen.
   Agregar hint en `hint_vision_por_banco()` si el formato lo requiere.

3. **No necesita Vision** (clave numérica o EasyOCR ya la maneja):
   ```python
   FORMATO_CLAVE = {
       ...
       'MI_BANCO': {},   # Vision omitida automáticamente
   }
   ```

4. **No hacer nada**: bancos no listados activan Vision por defecto (comportamiento conservador).

---

## Comportamiento del parser (`ocr.py`)

### Emisor — orden de detección

1. Identificador exclusivo (`detectar_banco_por_contexto`) — máxima certeza, va primero.
   Evita que el regex ruidoso sobreescriba el resultado (caso real: Azteca era detectado
   erróneamente como "CASHI CUENTA" por el regex antes de invertir la prioridad).
2. Etiqueta explícita en texto: `"banco origen:"`, `"banco emisor:"`, `"institución emisora:"`, etc.
3. Nombre del banco en las primeras 8 líneas (encabezado/logo).

### Monto — orden de detección

1. Etiqueta explícita: `"Cantidad"`, `"Monto"`, `"Importe"` seguidos del número.
   Patrón `[:\s]*\$?\s*` tolera etiqueta y `$` en líneas separadas (caso Banorte).
2. Primer `$` del documento (fallback para recibos sin etiqueta).

La prioridad de etiqueta es necesaria porque Banorte incluye `$ 0.00` (comisión, IVA)
además del monto real. Sin ella, EasyOCR podía devolver `0.00` en vez de `1.00`.

### Fecha — patrones soportados

| Patrón | Ejemplo |
|--------|---------|
| `dd/mm/yyyy` o `dd-mm-yyyy` | `23/02/2026` |
| `dd de mes de yyyy` | `23 de febrero de 2026` |
| `dd mes yyyy` | `23 febrero 2026` |
| `dd/Mon/yyyy` | `22/Feb/2026` |
| `dd mes_abrev yyyy` | `20 feb 2026` ← Banamex |
| `yyyy-mm-dd` | `2026-02-20` |

Meses abreviados: 
+ ES (`ene feb mar abr may jun jul ago sep oct nov dic`)
+ EN (`jan feb mar apr may jun jul aug sep oct nov dec`).

### `cuentaBeneficiaria`

Nunca se extrae. CLABEs de 18 dígitos aparecen también en folios y referencias del comprobante,
lo que genera falsos positivos. El usuario siempre la ingresa manualmente.
