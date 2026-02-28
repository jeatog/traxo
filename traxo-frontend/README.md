# traxo-frontend

Interfaz web de Traxo. SPA en Angular 19 que permite rastrear transferencias SPEI contra el portal de Banxico, guardar un historial personal y gestionar la cuenta del usuario.

---

## Tecnologías

| Herramienta | Versión | Rol |
|---|---|---|
| Angular | 19 | Framework principal (standalone components) |
| TypeScript | ~5.6 | Lenguaje |
| Tailwind CSS | 3 | Estilos utilitarios |
| Angular Signals | built-in | Estado reactivo local y global |
| Angular Service Worker | built-in | PWA / caché offline |
| RxJS | ~7.8 | Streams HTTP |

No se usan NgModules. Todos los componentes son standalone y se cargan con lazy loading por ruta.

---

## Rol en el monorepo

El frontend es la única capa visible al usuario. Delega toda la lógica de negocio al backend (`/api/*`) y no llama directamente al microservicio Python. El único conocimiento que tiene del stack es la URL base del API, configurable por entorno.

```
Usuario
  └─► traxo-frontend  (Angular, :80 en prod)
        └─► traxo-backend  (/api/*, :8080)
              ├─► PostgreSQL
              └─► traxo-micros  (:3000, solo para rastreo SPEI)
```

---

## Arquitectura

```
src/app/
├── core/                          # Servicios y utilidades singleton
│   ├── auth/
│   │   └── auth.service.ts        # Sesión via cookie HttpOnly; verifica sesión en APP_INITIALIZER
│   ├── interceptores/
│   │   ├── auth.interceptor.ts    # Añade withCredentials: true para enviar la cookie en cada petición
│   │   └── errores.interceptor.ts # Manejo global de errores HTTP; llama cerrarSesion() en 401
│   ├── guardias/
│   │   ├── autenticado.guard.ts   # Redirige a /inicio si no hay sesión activa
│   │   ├── invitado.guard.ts      # Redirige a /app si ya hay sesión activa
│   │   └── rastreo-publico.guard.ts
│   ├── bancos/
│   │   └── bancos.service.ts      # Catálogo de bancos (GET /api/bancos)
│   └── tema/
│       └── tema.service.ts        # Dark mode (localStorage + prefers-color-scheme)
│
├── layouts/                       # Shells de página según contexto
│   ├── layout-auth/               # Login / Registro (sin barra de navegación)
│   ├── layout-publico/            # Rastreo público + Aviso de privacidad
│   └── layout-autenticado/        # App autenticada con barra de navegación
│
├── features/                      # Funcionalidades organizadas por dominio
│   ├── autenticacion/
│   │   ├── perfil.service.ts      # GET /api/perfil con caché TTL 30 min
│   │   └── paginas/
│   │       ├── login/             # Formulario de inicio de sesión
│   │       ├── registro/          # Formulario de creación de cuenta
│   │       └── perfil/            # Editar nombre, contraseña, eliminar cuenta
│   ├── rastreo/
│   │   ├── rastreo.service.ts     # POST /api/rastreo, POST /api/rastreo/guardar, POST /api/rastreo/ocr
│   │   └── paginas/rastreo/       # Formulario de rastreo SPEI con OCR de comprobante y pantalla de resultado
│   ├── historial/
│   │   ├── historial.service.ts   # GET /api/historial con caché TTL 3 min, DELETE /api/historial/:id
│   │   └── paginas/historial/     # Lista de consultas guardadas con opción de borrar
│   └── legal/
│       └── aviso-privacidad/      # Página estática
│
└── shared/
    ├── components/
    │   └── confirm-dialog.component.ts  # Modal de confirmación reutilizable
    ├── textos.ts                  # Todas las cadenas de UI centralizadas
    └── utils/
        └── modelos.ts             # Interfaces TypeScript compartidas con el backend
```

### Rutas

| Ruta | Guard | Descripción |
|---|---|---|
| `/` | — | Redirige a `/app/historial` si hay sesión activa, o a `/inicio` si no |
| `/inicio` | `guardiaInvitado` | Landing page pública |
| `/rastreo` | `guardiaRastreoPublico` | Rastreo SPEI sin necesidad de login |
| `/login` | `guardiaInvitado` | Solo accesible sin sesión activa |
| `/registro` | `guardiaInvitado` | Solo accesible sin sesión activa |
| `/aviso-privacidad` | — | Pública |
| `/app` | `guardiaAutenticado` | Redirige a `/app/historial` |
| `/app/rastreo` | `guardiaAutenticado` | Rastreo con historial disponible |
| `/app/historial` | `guardiaAutenticado` | Historial de consultas personales |
| `/app/perfil` | `guardiaAutenticado` | Gestión de cuenta |
| `/**` | — | Redirige a `/rastreo` |

Todas las rutas usan `loadComponent()` — los bundles se cargan solo cuando el usuario navega a esa ruta.

### Autenticación

La sesión se gestiona mediante **cookie HttpOnly** (`traxo_token`), nunca en `localStorage` ni en headers visibles al JS.

- `AuthService.verificarSesion()` — se llama en `APP_INITIALIZER` (antes de que el router evalúe guards). Hace `GET /api/perfil`; si responde 200 la sesión es válida.
- `AuthService.estaAutenticado` — señal booleana que refleja el resultado de `verificarSesion()` o del login.
- `auth.interceptor.ts` — añade `withCredentials: true` a todas las peticiones para que el browser adjunte la cookie automáticamente.
- `errores.interceptor.ts` — ante un 401, si el usuario estaba autenticado, llama `cerrarSesion()` y redirige a `/inicio`.
- `autenticado.guard.ts` — si la señal es `false`, redirige a `/inicio`.

### Caché de datos

Para evitar llamadas HTTP redundantes al navegar entre pestañas, los servicios de datos implementan un **caché en memoria con TTL** basado en señales:

| Servicio | TTL | Invalidación manual |
|---|---|---|
| `HistorialService` | 3 min | Tras guardar un rastreo nuevo (`historialService.invalidar()`) |
| `PerfilService` | 30 min | Tras cambiar el nombre (actualiza la caché en lugar de re-fetcher) |

Al cerrar sesión (`cerrarSesion()`), ambas cachés se limpian para evitar que datos de un usuario sean visibles a otro en el mismo dispositivo.

### Estado reactivo

El estado se maneja con la API nativa de Signals de Angular 19. No hay store externo (NgRx, Akita, etc.):

- `AuthService.estaAutenticado` — señal booleana derivada de la verificación de sesión via cookie
- `TemaService.esModoOscuro` — persiste en `localStorage` y respeta `prefers-color-scheme`
- Componentes usan señales locales (`signal()`) para estados de carga, errores y éxitos
- `RastreoComponent`: señales para estado OCR (`analizandoOcr`, `errorOcr`, `faltantes`) — el formulario se pre-llena con los campos extraídos del comprobante

### PWA

Configurado con Angular Service Worker (`ngsw-worker.js`). Solo activo en build de producción (`!isDevMode()`). Permite cargar la shell sin conexión una vez que el usuario la ha visitado.

---

## Variables de entorno

Definidas en `src/environments/`:

| Variable | Desarrollo | Producción |
|---|---|---|
| `apiUrl` | `http://localhost:8080/api` | URL del servidor de producción |

---

## Correr localmente

**Requisitos:** Node.js ≥ 20, npm ≥ 10.

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo con hot reload
npm start
# → http://localhost:4200
```

El frontend espera el backend en `http://localhost:8080`. Si corre en otro puerto, editar `src/environments/environment.ts`.

Para que el formulario de rastreo funcione end-to-end, el backend también necesita acceso al microservicio Python (`traxo-micros`) en `http://localhost:3000`.

Las pantallas de login, registro y aviso de privacidad son completamente estáticas y no requieren el backend.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de desarrollo |
| `npm run build` | Build estándar |
| `npm run build:prod` | Build de producción optimizado |
| `npm test` | Ejecutar tests unitarios |

---

## Build para producción

```bash
npm run build:prod
# Salida en: dist/traxo-frontend/browser/
```

El `Dockerfile` en este directorio hace un build multi-etapa:

1. **Builder** (`node:20-alpine`): instala dependencias y ejecuta `build:prod`
2. **Producción** (`nginx:alpine`): sirve el `dist/` estático

La imagen resultante no contiene Node.js ni el código fuente.
