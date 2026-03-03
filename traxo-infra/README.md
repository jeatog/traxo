  
# Infraestructura — Traxo  
  
Configuración de contenedores Docker para el stack completo: base de datos, backend, microservicio Python, frontend y reverse proxy.  
  
## Contenedores  
  
| Servicio   | Imagen / Base            | Puerto interno | Descripción |  
|------------|--------------------------|:--------------:|-------------|  
| `postgres`     | `postgres:16-alpine`        | 5432    | Base de datos. Volumen persistente `postgres_data`. |
| `backend`      | `eclipse-temurin:21-jre`    | 8080    | API REST Spring Boot. Aplica migraciones Flyway al arrancar. |
| `micros`       | `python:3.12-slim`          | 3000    | FastAPI + Playwright. Pool de páginas de Chromium precargadas para scraping de Banxico. OCR de comprobantes con EasyOCR y Claude Haiku Vision. |
| `frontend`     | `nginx:alpine`              | 80      | Distribución estática de Angular. |
| `nginx`        | `nginx:alpine`              | 80, 443 | Reverse proxy. TLS termination. Redirige `/api/*` al backend y `/*` al frontend. |
| `dozzle`       | `amir20/dozzle`             | 8080    | Visor de logs de containers en tiempo real. Accesible en `/logs/` (basic auth). |
| `uptime-kuma`  | `louislam/uptime-kuma:1`    | 3001    | Monitoreo de servicios y alertas push. Solo accesible vía SSH tunnel. |  
  
Solo `nginx` expone puertos al host (80 y 443). El resto se comunica por red Docker interna.  
  
---  
  
## Tolerancia a fallos  
  
### Si cae un servicio  
  
| Servicio caído | Impacto |  
|----------------|---------|   
| `micros`       | El rastreo SPEI falla. El resto de la app (historial, perfil, login) sigue funcionando. |  
| `postgres`     | El backend pierde la base de datos: todas las operaciones autenticadas fallan. El frontend y nginx siguen en pie pero la app es inutilizable. |  
| `backend`      | Toda la lógica de negocio cae. El frontend se sirve pero no puede hacer llamadas a la API. |  
| `frontend`     | Los usuarios ven un error de nginx al acceder a `/`. La API sigue técnicamente disponible. |  
| `nginx`        | Nada es accesible desde fuera. Todo el stack interno sigue corriendo. |  
  
### Cuándo puede caer cada uno  
  
- **`micros`**: si Banxico cambia el HTML de su portal y el scraper falla al parsear; o si Chromium/Playwright lanza una excepción no controlada durante el lifespan. El health check lo detecta.  
- **`postgres`**: por falta de disco, memoria, o reinicio del host sin `restart: unless-stopped`.  
- **`backend`**: si falla una migración Flyway al arrancar (schema incoherente), o si no puede conectar con la BD.  
- **`nginx`**: raro. Puede fallar si los certificados TLS no existen o expiran.  
  
El compose tiene `restart: unless-stopped` en todos los servicios, por lo que se recuperan solos de reinicios del host o crasheos transitorios.  
  
---  
  
## Pre-requisitos

- Docker Engine ≥ 24 y Docker Compose v2 (`docker compose`, no `docker-compose`)
- **No es necesario crear la base de datos ni ejecutar queries manualmente.** PostgreSQL crea la base al arrancar y Flyway aplica todas las migraciones pendientes automáticamente cada vez que el backend inicia.

### Variables de entorno (.env)

Copiar `.env.example` como `.env` y completar los valores.

| Variable | Obligatoria | Descripción |
|---|---|---|
| `JWT_SECRETO` | Sí | Clave secreta para firmar tokens JWT. |
| `MICROS_API_KEY` | Recomendada | Clave compartida entre backend y micros. |
| `ANTHROPIC_API_KEY` | Opcional | Mejora el OCR de claves de rastreo con Claude Haiku Vision. Sin ella el OCR funciona solo con EasyOCR. |
| `TURNSTILE_SECRET_KEY` | Opcional | Clave secreta de Cloudflare Turnstile. Si se omite, la verificación anti-bot se salta (útil en desarrollo). |

Generar `JWT_SECRETO` con:

```bash
openssl rand -base64 48
```

Pegar el resultado en `.env`:

```
JWT_SECRETO=<salida del comando anterior>
```

### Certificados TLS

Colocar los certificados en `traxo-infra/nginx/certs/` antes del primer despliegue:

```
nginx/certs/
├── fullchain.pem
└── privkey.pem
```

Se usan **Cloudflare Origin Certificates** (gratuitos, válidos 15 años). Instrucciones paso a paso en [`CERTIFICADO_CLOUDFLARE.md`](CERTIFICADO_CLOUDFLARE.md).

> Con Cloudflare en proxy mode, el navegador nunca ve el Origin Certificate directamente — ve el certificado del edge de Cloudflare. El Origin Certificate solo lo valida Cloudflare al conectar con el servidor (modo Full strict).

### Configuración de Nginx

El archivo `nginx/nginx.conf` ya incluye la configuración de seguridad lista para producción. El nombre del servidor se establece en `server_name`:

```nginx
server_name traxo.mx;
```

**Rate limiting** — protege los endpoints de autenticación contra fuerza bruta:

| Endpoint | Límite | Burst |
|---|---|---|
| `POST /api/auth/login` | 5 req/min por IP | 3 |
| `POST /api/auth/registro` | 3 req/min por IP | 1 |

Las peticiones que excedan el límite reciben `429 Too Many Requests`.

**Cloudflare real IP** — cuando nginx está detrás del proxy de Cloudflare, la IP del cliente llega en el header `CF-Connecting-IP`. La config restaura la IP real para que el rate limiting funcione por usuario y no por IP de Cloudflare:

```nginx
set_real_ip_from <rangos IP de Cloudflare>;
real_ip_header CF-Connecting-IP;
```

**Content-Security-Policy** — restringe qué recursos puede cargar el navegador:

```
default-src 'self'
script-src  'self' 'unsafe-inline' https://challenges.cloudflare.com   (Turnstile)
style-src   'self' 'unsafe-inline'   (necesario para Angular/Tailwind)
img-src     'self' data:
connect-src 'self' https://challenges.cloudflare.com   (Turnstile XHR)
frame-src   https://challenges.cloudflare.com          (iframe de Turnstile)
worker-src  'self'                   (Service Worker PWA)
frame-ancestors 'none'
```
  
---  
  
## Cómo buildear  
  
Desde `traxo-infra/`:  
  
```bash  
# Construir todos los servicios  
./scripts/build.sh  
  
# Construir un servicio específico  
./scripts/build.sh backend  
./scripts/build.sh frontend micros  
  
# Construir y subir imágenes al registro  
./scripts/build.sh --push  
./scripts/build.sh backend --push  
```  
  
El build no levanta ningún contenedor.  
  
---  
  
## Cómo desplegar (primera vez o re-despliegue completo)  
  
```bash  
./scripts/despliegue.sh  
```  
  
El script verifica que exista `.env`, detiene contenedores anteriores, reconstruye las imágenes y levanta el stack. Implica **breve downtime** durante la secuencia `down → build → up`.  
  
---  
  
## Cómo actualizar en servidor  
  
### Todos los servicios  
  
```bash  
git pull  
./scripts/despliegue.sh  
```  
  
### Un servicio específico (sin downtime en el resto)  
  
```bash  
# Desde traxo-infra/  
docker compose --env-file .env build --no-cache <servicio>  
docker compose --env-file .env up -d --no-deps <servicio>  
```  
  
Ejemplos:  
  
```bash  
# Solo el backend  
docker compose --env-file .env build --no-cache backend  
docker compose --env-file .env up -d --no-deps backend  
  
# Solo el microservicio Python  
docker compose --env-file .env build --no-cache micros  
docker compose --env-file .env up -d --no-deps micros  
  
# Solo el frontend  
docker compose --env-file .env build --no-cache frontend  
docker compose --env-file .env up -d --no-deps frontend  
```  
  
`--no-deps` evita reiniciar los servicios de los que depende.  
  
### Solo la base de datos (migraciones Flyway)  
  
Las migraciones se aplican automáticamente al arrancar el backend. Para forzar una migración sin redesplegar todo:  
  
```bash  
docker compose --env-file .env up -d --no-deps --force-recreate backend  
```  
  
---  
  
## Logs y diagnóstico

```bash
# Logs de todos los servicios
docker compose --env-file .env logs -f

# Logs de un servicio
docker compose --env-file .env logs -f backend
docker compose --env-file .env logs -f micros

# Estado de los contenedores y health checks
docker compose --env-file .env ps
```

---

## CI/CD — Deploy automático con GitHub Actions

El workflow `.github/workflows/deploy.yml` detecta qué servicios cambiaron en cada push a `master` y solo reconstruye los afectados.

### Cómo funciona

1. `dorny/paths-filter` compara los archivos modificados en el push contra las rutas de cada servicio.
2. Si algún servicio cambió, se conecta al VPS vía SSH (`appleboy/ssh-action`), hace `git pull` y ejecuta solo las acciones necesarias.

| Ruta modificada | Acción en el VPS |
|---|---|
| `traxo-frontend/**` | `docker compose build --no-cache frontend && up -d --no-deps frontend` |
| `traxo-backend/**` | `docker compose build --no-cache backend && up -d --no-deps backend` |
| `traxo-micros/**` | `docker compose build --no-cache micros && up -d --no-deps micros` |
| `traxo-infra/nginx/**` | `docker compose up -d --no-deps --force-recreate nginx` |
| `traxo-infra/docker-compose.yml` | `docker compose up -d` |

> nginx usa `--force-recreate` porque su `nginx.conf` es un bind mount a nivel de archivo (inode fijo). `git pull` reemplaza el archivo con un nuevo inode, por lo que `nginx -s reload` no recoge el cambio — recrear el container sí.

### Secrets necesarios en GitHub

| Secret | Descripción |
|---|---|
| `VPS_HOST` | IP o dominio del servidor |
| `VPS_USER` | Usuario SSH |
| `VPS_SSH_KEY` | Clave privada SSH **sin passphrase** |
| `VPS_PROJECT_PATH` | Ruta absoluta del repo en el servidor (ej. `/home/user/traxo`) |

La clave pública correspondiente debe estar en `~/.ssh/authorized_keys` del servidor.

---

## Observabilidad

### Dozzle — logs de containers

Visor de logs en tiempo real accesible desde el navegador.

**Setup inicial (una sola vez en el VPS):**

```bash
# Instalar herramienta para generar contraseñas
sudo apt-get install -y apache2-utils

# Crear el archivo de credenciales (desde traxo-infra/)
htpasswd -c nginx/.htpasswd admin
```

Después del primer deploy, recrear el container nginx para que tome el nuevo archivo:

```bash
docker compose --env-file .env up -d --no-deps --force-recreate nginx
```

**Uso:**
- Abrir `https://traxo.mx/logs/` en el navegador o móvil
- Selecciona el container para ver sus logs en vivo

---

### Uptime Kuma — monitoreo y alertas

Uptime Kuma monitorea que los health checks de los servicios respondan y manda alertas algo cae.

**No está expuesto públicamente** — se administra una sola vez vía SSH tunnel y luego funciona de forma autónoma mandando notificaciones push.

**Setup inicial:**

```bash
# Localmente
ssh -L 3001:localhost:3001 user@vps-ip

# Abrir
# http://localhost:3001
```

Configurar en la UI:
1. Crear cuenta de administrador (solo la primera vez)
2. Agregar monitores — recomendados:

| Monitor | URL / Host | Tipo |
|---|---|---|
| Backend health | `http://backend:8080/api/actuator/health` | HTTP |
| Micros health | `http://micros:3000/health` | HTTP |
| Postgres | `postgres:5432` | TCP Port |
| Frontend | `http://frontend:80` | HTTP |

3. Configurar notificaciones

Una vez configurado, cerrar el túnel. Uptime Kuma sigue corriendo y manda alertas de forma autónoma.

---

## Backup de PostgreSQL

El script `scripts/backup_postgres.sh` genera un dump diario y elimina automáticamente los backups con más de 7 días de antigüedad.

Los backups se guardan en `/var/backups/traxo/` por defecto. Para usar otra ruta, exportar `BACKUP_DIR` antes de ejecutar o en el crontab.

**Ejecutar manualmente:**

```bash
./scripts/backup_postgres.sh
```

**Programar con cron (backup diario a las 3:00 AM):**

```bash
crontab -e
```

Agregar la línea (por definir la ruta absoluta en el servidor):

```
0 3 * * * /ruta/absoluta/git/traxo/traxo-infra/scripts/backup_postgres.sh >> /var/log/traxo_backup.log 2>&1
```

**Restaurar un backup:**

```bash
docker compose --env-file .env exec -T postgres \
  pg_restore -U traxo -d traxo --clean < /var/backups/traxo/traxo_YYYYMMDD_HHMMSS.dump
```
