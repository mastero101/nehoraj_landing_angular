# Documentación Técnica — Nehoraj Landing

> Documento complementario al [README.md](README.md), orientado a desarrolladores que necesiten entender la arquitectura, la API y los módulos internos del proyecto.

---

## 1. Visión general

**Nehoraj Landing** es una aplicación **Angular 17** con **Server-Side Rendering (SSR)** que sirve como sitio corporativo de Nehoraj. Incluye:

- Landing page one-page (hero, servicios, planes de coworking, testimonios, aliados, contacto).
- Chat de atención al cliente potenciado por **OpenAI** (GPT-4o-mini).
- Sistema de **blog** completo (listado, detalle, panel de administración) con backend propio.
- **Calendario** de reservas (actualmente con datos simulados/mock).
- Notificaciones vía **WhatsApp** (Meta Cloud API y Twilio).
- Backend API embebido en Express, reutilizado tanto para SSR local como para **Vercel Serverless Functions**.

El backend del blog usa **Supabase** (Postgres) como base de datos y **Vercel Blob** para almacenamiento de archivos multimedia.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework frontend | Angular 17 (standalone components) |
| Renderizado | Angular Universal / SSR (`@angular/ssr`) |
| Estilos | TailwindCSS 3 + SCSS |
| Backend HTTP | Express 4 |
| Base de datos | Supabase (Postgres) vía `@supabase/supabase-js` |
| Almacenamiento de archivos | Vercel Blob (`@vercel/blob`) |
| Autenticación | JWT (`jsonwebtoken`) + hash de contraseñas (`bcryptjs`) |
| IA conversacional | OpenAI API (`gpt-4o-mini`) vía `axios` |
| Mensajería | Meta WhatsApp Cloud API, Twilio |
| Despliegue | Vercel (serverless + SSR) |
| Testing | Karma + Jasmine |
| Cliente API (manual) | Bruno (`Nehoraj/*.bru`) |

---

## 3. Estructura del proyecto

```
├── api/
│   └── [...route].ts          # Entry point serverless de Vercel (envuelve server-api.ts)
├── src/
│   ├── main.ts                 # Bootstrap del cliente (browser)
│   ├── main.server.ts          # Bootstrap del servidor (SSR)
│   ├── server-api.ts           # Router Express: auth, blog CRUD, upload
│   ├── app/
│   │   ├── app.component.ts    # Shell raíz de la aplicación
│   │   ├── app.routes.ts       # Rutas Angular (/mision, /calendar)
│   │   ├── app.config.ts       # Configuración de providers (browser)
│   │   ├── app.config.server.ts# Configuración de providers (server)
│   │   ├── components/
│   │   │   ├── nehoraj/            # Componente principal de la landing (hero, planes, testimonios, ...)
│   │   │   ├── chat/               # Widget de chat con OpenAI
│   │   │   ├── calendar/           # Calendario de reservas (mock)
│   │   │   ├── mision-vision/      # Sección misión/visión
│   │   │   ├── social-respons/     # Sección de responsabilidad social
│   │   │   ├── blog-list/          # Listado público de artículos
│   │   │   ├── blog-detail/        # Detalle de un artículo
│   │   │   └── blog-admin/         # Panel CRUD del blog (login + gestión)
│   │   ├── services/
│   │   │   ├── blog.service.ts         # Cliente HTTP hacia /api (auth + blog + upload)
│   │   │   ├── openai.service.ts       # Integración con OpenAI Chat Completions
│   │   │   ├── notification.service.ts # Envío de WhatsApp (Meta / Twilio)
│   │   │   └── google-calendar.service.ts # Servicio mock de eventos de calendario
│   │   └── models/
│   │       ├── blog.model.ts   # Interfaz BlogPost
│   │       └── user.model.ts   # Interfaces User / AuthResponse
│   └── environments/            # environment.ts / .development.ts / .prod.ts
├── server.ts                    # Servidor Express standalone para SSR (uso local/Node)
├── vercel.json                  # Reescritura de /api/* hacia la función serverless
├── Nehoraj/                     # Colección Bruno para probar la API manualmente
└── angular.json / package.json
```

---

## 4. Arquitectura del backend

El proyecto **reutiliza el mismo router de Express** (`src/server-api.ts`) en dos contextos distintos, evitando duplicar lógica:

1. **SSR local / `node dist/.../server.mjs`** ([server.ts](server.ts))
   Levanta un servidor Express completo que:
   - Monta el router del blog en `/api`.
   - Sirve los assets estáticos del build de Angular (`browser/`).
   - Renderiza cualquier otra ruta con `CommonEngine` (Angular Universal SSR).

2. **Vercel Serverless Function** ([api/[...route].ts](api/[...route].ts))
   Captura *todas* las rutas bajo `/api/*` (ver `vercel.json`, que reescribe `/api/(.*)` → `/api/[...route]`), crea una app Express mínima (sin motor de renderizado) y monta el mismo router tanto en `/` como en `/api` para tolerar diferencias de *runtime* de Vercel. La app se cachea en `cachedApp` para reutilizar la conexión entre invocaciones (warm start).

Ambos entry points comparten `src/server-api.ts`, que centraliza:
- Carga de variables de entorno desde `.env` si no están ya en `process.env` (para desarrollo local sin `vercel dev`).
- Cliente Supabase.
- Middleware de autenticación JWT.
- Endpoints de auth, blog (CRUD) y subida de archivos.

### 4.1 Variables de entorno del backend

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_KEY` | Clave anon o service_role de Supabase |
| `JWT_SECRET` | Secreto para firmar/verificar tokens JWT (7 días de expiración) |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob (inyectado automáticamente en Vercel) |

Si `SUPABASE_URL` o `SUPABASE_KEY` no están definidas, **todas** las rutas del router responden `500` mediante un middleware de guardia (`server-api.ts:61`).

### 4.2 Endpoints de la API

Base path: `/api` (en Vercel) o directamente montado en `server.ts`.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | No | Estado del backend y presencia de variables de entorno |
| POST | `/auth/register` | No | Crea un usuario en `blog_users` (rol `author`, password con bcrypt) |
| POST | `/auth/login` | No | Valida credenciales y devuelve JWT + datos de usuario |
| GET | `/blog` | No | Lista artículos (`blog_posts`), filtro opcional `?category=` |
| GET | `/blog/:id` | No | Detalle de un artículo |
| POST | `/blog` | **Sí (Bearer JWT)** | Crea un artículo |
| PUT | `/blog/:id` | **Sí (Bearer JWT)** | Actualiza un artículo |
| DELETE | `/blog/:id` | **Sí (Bearer JWT)** | Elimina un artículo |
| POST | `/upload` | **Sí (Bearer JWT)** | Sube un archivo binario a Vercel Blob (imagen/audio/etc., hasta 500 MB) y devuelve la URL pública |

**Autenticación:** header `Authorization: Bearer <token>`, verificado por `authenticateToken` (`server-api.ts:92`), que adjunta `req.user = { userId, username, role }`.

**Tablas Supabase esperadas:**
- `blog_users` (`id`, `username`, `password_hash`, `role`)
- `blog_posts` (`id`, `title`, `excerpt`, `content`, `category`, `author_name`, `author_role`, `author_avatar`, `cover_image`, `tags`, `reading_time`, `created_at`, `updated_at`)

Una colección [Bruno](https://www.usebruno.com/) con ejemplos de estas peticiones está disponible en [Nehoraj/](Nehoraj/) (`api GET.bru`, `api Health.bru`, `articulo.bru`, `auth Login.bru`).

---

## 5. Frontend: componentes y servicios

### 5.1 Componentes (`src/app/components`)

| Componente | Selector | Responsabilidad |
|---|---|---|
| `NehorajComponent` | `app-nehoraj` | Orquesta la landing: hero, servicios, planes de coworking, testimonios, aliados, y controla qué vista del blog se muestra (`'none' \| 'list' \| 'detail' \| 'admin'`) |
| `ChatComponent` | `app-chat` | Widget flotante de chat; mantiene historial de mensajes y lo envía a `OpenaiService` |
| `CalendarComponent` | `app-calendar` | UI de calendario/reservas, consume `GoogleCalendarService` (mock) |
| `MisionVisionComponent` | `app-mision-vision` | Sección estática de misión y visión; también accesible como ruta `/mision` |
| `SocialRespons Component` | `app-social-respons` | Sección de responsabilidad social |
| `BlogListComponent` | `app-blog-list` | Lista pública de artículos, con filtro por categoría |
| `BlogDetailComponent` | `app-blog-detail` | Vista de detalle de un artículo (recibe el id seleccionado) |
| `BlogAdminComponent` | `app-blog-admin` | Login de administrador + CRUD de artículos (crear/editar/eliminar), sube portadas vía `BlogService.uploadFile` |

Todos los componentes son **standalone** (patrón Angular 17), importando directamente sus dependencias (`CommonModule`, `FormsModule`, otros componentes) en el decorador `@Component`.

### 5.2 Rutas Angular (`app.routes.ts`)

```
/mision     → MisionVisionComponent
/calendar   → CalendarComponent
```

El resto de la navegación (blog, chat, secciones de la landing) se maneja **por estado interno** en `NehorajComponent`, no por el router — es decir, es una single-page sin rutas adicionales para esas vistas.

### 5.3 Servicios (`src/app/services`)

- **`BlogService`** — Cliente HTTP hacia `/api`. Gestiona:
  - Sesión de usuario (`currentUser$` como `BehaviorSubject`, persistida en `localStorage` como `blog_token` / `blog_user`).
  - CRUD de artículos y subida de archivos con progreso (`uploadFile` expone eventos `{progress}` y `{url}`).
  - Es *SSR-safe*: usa `isPlatformBrowser` para evitar acceder a `localStorage` o disparar peticiones en el servidor durante el render.

- **`OpenaiService`** — Llama a `https://api.openai.com/v1/chat/completions` (modelo `gpt-4o-mini`) con un system prompt fijo que define la identidad y el guion de ventas del asistente de Nehoraj (servicios, propuesta de valor, contacto, aliados).

- **`NotificationService`** — Envío de mensajes de WhatsApp por dos vías intercambiables: Meta WhatsApp Cloud API (`sendWhatsAppMeta`) y Twilio (`sendWhatsAppTwilio`).

- **`GoogleCalendarService`** — **Mock** en memoria (`getEvents` / `createEvent`); no está conectado a la API real de Google Calendar todavía.

### 5.4 Modelos (`src/app/models`)

```ts
// blog.model.ts
interface BlogPost {
  id?: string; title: string; excerpt?: string; content: string;
  category: string; author_name?: string; author_role?: string;
  author_avatar?: string; cover_image?: string; tags?: string[];
  reading_time?: string; created_at?: string; updated_at?: string;
}

// user.model.ts
interface User { id: string; username: string; role: string; }
interface AuthResponse { message: string; token: string; user: User; }
```

---

## 6. Configuración y variables de entorno (frontend)

Angular consume `src/environments/environment*.ts` con la forma:

```ts
export const environment = {
  production: false,
  openaiApiKey: 'tu_api_key',
  meta: { phoneNumberId, accessToken },
  twilio: { accountSid, authToken, whatsappNumber }
};
```

> ⚠️ **Nota de seguridad:** `openaiApiKey`, las credenciales de Meta y de Twilio se compilan dentro del bundle del **cliente** (son leídas directamente por `OpenaiService` / `NotificationService` en el navegador). Esto expone las claves en el código servido al público. Para producción, se recomienda mover estas llamadas detrás del backend (`server-api.ts`) igual que ya se hizo con Supabase, en vez de exponer las API keys en `environment.ts`.

El backend (Express/Vercel) usa variables separadas vía `.env` (ver sección 4.1), cargadas con `loadEnvFromFile()` cuando no provienen del entorno de ejecución (por ejemplo en Vercel, donde se inyectan directamente).

---

## 7. Ejecución local

```bash
npm install
npm start          # ng serve → http://localhost:4200
```

Para probar el SSR + API tal como corre en producción (Node):

```bash
npm run build
npm run serve:ssr:nehoraj_landing   # node dist/nehoraj_landing/server/server.mjs
```

Requiere un `.env` en la raíz con `SUPABASE_URL`, `SUPABASE_KEY` y `JWT_SECRET` (ver [.env.example](.env.example)) para que las rutas del blog respondan correctamente.

Existe también `proxy.conf.json` para redirigir peticiones `/api` durante `ng serve` hacia un backend local si se ejecuta por separado.

---

## 8. Despliegue (Vercel)

- `vercel.json` reescribe cualquier petición a `/api/(.*)` hacia la función serverless `api/[...route].ts`, que internamente monta el mismo router de Express usado en SSR.
- El resto del tráfico (páginas) se sirve mediante el build SSR de Angular Universal generado por `@angular/ssr` (carpeta `dist/nehoraj_landing/`).
- Variables de entorno de producción (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`) deben configurarse en el dashboard de Vercel — `BLOB_READ_WRITE_TOKEN` se inyecta automáticamente al habilitar Vercel Blob.

---

## 9. Testing

- Pruebas unitarias con **Karma + Jasmine** (`npm test`).
- Specs existentes: `app.component.spec.ts`, `calendar.component.spec.ts`, `mision-vision.component.spec.ts`, `nehoraj.component.spec.ts`, `social-respons.component.spec.ts`, `google-calendar.service.spec.ts`, `notification.service.spec.ts`, `openai.service.spec.ts`.
- Pruebas manuales de API disponibles como colección Bruno en [Nehoraj/](Nehoraj/).

---

## 10. Puntos a tener en cuenta / deuda técnica

- **`GoogleCalendarService`** es un mock; el calendario no persiste datos reales todavía.
- Las claves de **OpenAI, Meta y Twilio** viven en el bundle del cliente (`environment.ts`), lo cual las expone públicamente — candidato a mover al backend.
- El middleware de guardia en `server-api.ts` responde `500` en *todas* las rutas (incluida `/health` en la práctica, según orden de registro) si faltan las variables de Supabase, lo cual es útil para detectar despliegues mal configurados.
- `JWT_SECRET` tiene un valor por defecto hardcodeado (`'nehoraj-super-secret-key-2026'`) si la variable de entorno no está definida — debe fijarse siempre en producción.
