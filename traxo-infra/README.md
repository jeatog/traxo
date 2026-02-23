  
# Infraestructura — Traxo  
  
Configuración de contenedores Docker para el stack completo: base de datos, backend, microservicio Python, frontend y reverse proxy.  
  
## Contenedores  
  
| Servicio   | Imagen / Base            | Puerto interno | Descripción |  
|------------|--------------------------|:--------------:|-------------|  
| `postgres` | `postgres:16-alpine`     | 5432           | Base de datos. Volumen persistente `postgres_data`. |  
| `backend`  | `eclipse-temurin:21-jre` | 8080           | API REST Spring Boot. Aplica migraciones Flyway al arrancar. |  
| `micros`   | `python:3.12-slim`       | 3000           | FastAPI + Playwright. Mantiene un pool de páginas de Chromium precargadas. |  
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
- Archivo `traxo-infra/.env` creado a partir de `.env.example` con todos los valores completos  
- Certificados TLS en `traxo-infra/nginx/certs/`:  
- **No es necesario crear la base de datos ni ejecutar queries manualmente.** PostgreSQL crea la base al arrancar (a partir de `DB_NAME`) y Flyway aplica todas las migraciones pendientes automáticamente cada vez que el backend inicia. Las migraciones futuras solo requieren añadir el archivo SQL en `traxo-backend/src/main/resources/db/migration/`.  
- `fullchain.pem`  
- `privkey.pem`  
  
Para obtener certificados con Let's Encrypt (en el servidor, antes del primer despliegue):  
  
```bash  
certbot certonly --standalone -d traxo.mx  
cp /etc/letsencrypt/live/traxo.mx/fullchain.pem nginx/certs/  
cp /etc/letsencrypt/live/traxo.mx/privkey.pem   nginx/certs/  
```  
  
También actualizar `server_name` en `nginx/nginx.conf` con el dominio real.  
  
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
