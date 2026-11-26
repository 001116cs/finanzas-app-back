# finanzas-app-back

API REST de finanzas-app (NestJS, Drizzle ORM, Postgres, Supabase Auth). Arquitectura hexagonal por módulo (`perfil`, `categorias`, `transacciones`, `importaciones`, `uso-ia`, `boletas`, `health`).

## Requisitos

Node 22+, Docker.

## Puesta en marcha local

```bash
cp .env.example .env        # completa SUPABASE_URL con tu proyecto
docker compose up -d        # Postgres 16: bases `finanzas` y `finanzas_test`
npm ci
npm run build && npm run db:migrate   # lee DATABASE_URL de .env
npm run start:dev           # http://localhost:3001 (Swagger UI en /docs)
```

`main.ts` y `migrar.ts` cargan `.env` si existe (las variables ya definidas en el entorno tienen prioridad). Si arrancas con `SUPABASE_URL` de ejemplo (`TU-PROYECTO`) el servidor levanta, pero las peticiones autenticadas fallarán hasta que apuntes a tu proyecto.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a Postgres de la app. |
| `DATABASE_URL_TEST` | Postgres para los tests e2e (sólo desarrollo). |
| `SUPABASE_URL` | URL del proyecto Supabase; de ahí se obtienen las claves (JWKS) para validar el JWT. El proyecto debe usar claves de firma JWT asimétricas (Project Settings → JWT Keys); el secreto HS256 heredado no valida. |
| `FRONT_URL` | Origen del front; es el único permitido por CORS. |
| `PORT` | Puerto HTTP (por defecto `3001`). |
| `AI_PROVIDER` | Lector de boletas: `falso` (datos fijos, sin red) o `claude`. **Obligatoria en producción** (usa `claude`). |
| `ANTHROPIC_API_KEY` | API key de Anthropic. **Obligatoria con `AI_PROVIDER=claude`.** Secreto. |
| `AI_MODEL_RECEIPTS` | Modelo para leer boletas (por defecto `claude-sonnet-5-5`; debe tener precio conocido). |
| `AI_LIMIT_RECEIPTS` | Boletas escaneadas por usuario y mes (por defecto `20`). |
| `AI_LIMIT_FAILED_ATTEMPTS` | Intentos fallidos (boleta ilegible) por usuario y mes (por defecto `10`). |
| `AI_GLOBAL_MONTHLY_BUDGET_USD` | Presupuesto global mensual de IA en USD (por defecto `10`). |
| `STORAGE_DRIVER` | Dónde se guardan las imágenes de boletas: `disco` o `supabase`. **Obligatoria en producción** (usa `supabase`). |
| `STORAGE_LOCAL_DIR` | Directorio del driver `disco` (por defecto `.almacen-local`). |
| `STORAGE_BUCKET` | Bucket de Supabase Storage (por defecto `boletas`; debe ser **privado**). |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role de Supabase. **Obligatoria con `STORAGE_DRIVER=supabase`.** Secreto: nunca en el front. |

## Tests y calidad

```bash
npm test             # unitarios
npm run test:e2e     # e2e contra Postgres real (requiere docker compose up)
npx tsc --noEmit
npm run lint
```

## OpenAPI

```bash
npm run openapi:export
```

Escribe `openapi.json` en la raíz (no necesita base de datos ni variables reales). El front genera sus tipos a partir de este archivo; vuelve a exportarlo y commitéalo cuando cambie la API. Swagger UI en `/docs` sólo cuando `NODE_ENV !== 'production'`.

## Migraciones

El esquema está en `src/db/schema.ts`. Tras cambiarlo: `npm run db:generate` y commitea la carpeta `drizzle/`. `npm run db:migrate` aplica las migraciones pendientes (ejecuta `dist/scripts/migrar.js`: requiere `npm run build` previo y `DATABASE_URL`).

## Despliegue en Railway

La guía completa de despliegue (Supabase, Railway y Vercel, en orden) está en el [README del front](../finanzas-app-front/README.md#despliegue). Resumen para este servicio:

1. Crea un servicio desde este repo; Railway detecta el `Dockerfile`.
2. Define `DATABASE_URL` (cadena del **Session pooler** de Supabase, puerto 5432; no uses el Transaction pooler, puerto 6543, porque no soporta sentencias preparadas), `SUPABASE_URL`, `FRONT_URL` (URL pública del front) y `NODE_ENV=production`. Railway aporta `PORT`. Para las boletas define además `AI_PROVIDER=claude`, `ANTHROPIC_API_KEY`, `STORAGE_DRIVER=supabase` y `SUPABASE_SERVICE_ROLE_KEY`, y crea en Supabase (Storage) un bucket **privado** llamado `boletas`.
3. Pre-deploy command: `npm run db:migrate`. Dentro de la imagen ejecuta `node dist/scripts/migrar.js`, que aplica `./drizzle` (la imagen ya incluye `dist/`, `drizzle/` y las dependencias de producción).
4. Healthcheck: `GET /health` → `{"status":"ok"}`.
