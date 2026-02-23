# Seguridad y Privacidad — Traxo

## Principio rector

**Mínima retención de datos.** Traxo recopila únicamente lo necesario para mostrar el historial al usuario. Los datos sensibles de la transferencia se descartan en memoria tras ser procesados y nunca se escriben a disco ni a base de datos.

---

## Qué se almacena y qué no

| Dato | Se almacena | Razón |
|---|---|---|
| Email del usuario | Sí | Identificación de cuenta |
| Contraseña (hash bcrypt) | Sí | Autenticación |
| Nombre del usuario | Sí | Personalización |
| Fecha de operación | Sí | Historial |
| Hora de operación | Sí | Historial |
| Monto | Sí | Historial |
| Banco emisor (nombre) | Sí | Historial |
| Banco receptor (nombre) | Sí | Historial |
| Estado de la transferencia | Sí | Historial |
| Concepto | Sí | Historial |
| Alias opcional | Sí | Definido por el propio usuario |
| **Clave de rastreo SPEI** | **No** | Solo se usa para consultar Banxico |
| **CLABE del ordenante** | **No** | Dato de tercero — no se retiene |
| **CLABE del beneficiario** | **No** | Dato de tercero — no se retiene |
| **Nombre del ordenante** | **No** | Dato de tercero — no se retiene |
| **Nombre del beneficiario** | **No** | Dato de tercero — no se retiene |

El backend recibe `nombreEmisor` y `nombreReceptor` de Banxico cuando se solicita `datosCompletos: true`, los devuelve al frontend para mostrarlos en sesión, pero los descarta antes de persistir (`POST /api/rastreo/guardar` los recibe y los ignora explícitamente).

---

## Seguridad en el backend

- **JWT stateless**: tokens firmados con HMAC-SHA256. El secreto se provee via variable de entorno (`JWT_SECRETO`), nunca en código fuente ni en defaults.
- **BCrypt**: contraseñas hasheadas con factor de costo 10 por defecto.
- **CORS**: configurado en `SeguridadConfig.java`. Ajustar el origen permitido antes de producción.
- **HTTPS**: forzado en Nginx. HTTP redirige permanentemente (301) a HTTPS.
- **Cabeceras de seguridad**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` configuradas en `nginx.conf`.
- **Validación de entrada**: Bean Validation en todos los DTOs. No se confía en datos del cliente.
- **Errores genéricos**: el backend devuelve `ProblemDetail` (RFC 9457) con mensajes descriptivos pero sin stack traces ni detalles internos.

---

## Seguridad en el frontend

- El token JWT se almacena en `localStorage`. Es un compromiso pragmático para PWA: una cookie `HttpOnly` requeriría configuración adicional de servidor fuera del alcance actual.
- El interceptor `auth.interceptor.ts` adjunta el token solo a peticiones al propio backend.
- El interceptor `errores.interceptor.ts` detecta respuestas `401` y cierra sesión automáticamente.
- Las guardias de ruta impiden el acceso a rutas protegidas sin token válido en memoria.

---

## Seguridad en el microservicio Python

- El microservicio no está expuesto públicamente: solo es accesible desde la red Docker interna (`http://micros:3000`).
- Las peticiones al microservicio requieren el header `x-internal-key` con la `MICROS_API_KEY` compartida.
- Playwright corre en modo headless sin persistencia de cookies entre sesiones de scraping.
- Los datos sensibles de la respuesta de Banxico se procesan en memoria y nunca se escriben a disco.

---

## Eliminación de cuenta

El endpoint `DELETE /api/perfil` elimina en cascada:

1. Todas las consultas del historial del usuario (tabla `consultas`)
2. El registro del usuario (tabla `usuarios`)

La eliminación es inmediata e irreversible. No hay período de gracia ni papelera.

---

## TODO
- Migrar el token JWT de `localStorage` a cookie `HttpOnly` + `Secure` + `SameSite=Strict` — ver `PENDIENTE_JWT_COOKIE.md`. Como esto afecta el entorno local y creo que no es tan necesario para producción pequeña, lo dejo pendiente. Pero sería bueno tenerlo cuanto antes.
