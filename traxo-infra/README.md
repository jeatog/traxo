  
# Infraestructura — Traxo  
  
Configuración de contenedores Docker para el stack completo: base de datos, backend, microservicio Python, frontend y reverse proxy.  
  
## Contenedores  
  
| Servicio   | Imagen / Base            | Puerto interno | Descripción |  
|------------|--------------------------|:--------------:|-------------|  
| `postgres` | `postgres:16-alpine`     | 5432           | Base de datos. Volumen persistente `postgres_data`. |  
| `backend`  | `eclipse-temurin:21-jre` | 8080           | API REST Spring Boot. Aplica migraciones Flyway al arrancar. |  
| `micros`   | `python:3.12-slim`       | 3000           | FastAPI + Playwright. Pool de páginas de Chromium precargadas para scraping de Banxico. OCR de comprobantes con EasyOCR y Claude Haiku Vision. |  
| `frontend` | `nginx:alpine`           | 80             | Distribución estática de Angular. |  
| `nginx`    | `nginx:alpine`           | 80, 443        | Reverse proxy. TLS termination. Redirige `/api/*` al backend y `/*` al frontend. |  
  
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

Con Let's Encrypt (en el servidor):

```bash
certbot certonly --standalone -d traxo.mx
cp /etc/letsencrypt/live/traxo.mx/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/traxo.mx/privkey.pem   nginx/certs/
```

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

**Content-Security-Policy** — restringe qué recursos puede cargar el navegador:

```
default-src 'self'
script-src  'self'
style-src   'self' 'unsafe-inline'   (necesario para Angular/Tailwind)
img-src     'self' data:
connect-src 'self'                   (peticiones XHR/fetch solo al mismo origen)
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
