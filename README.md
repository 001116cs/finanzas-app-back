# finanzas-app-back

API REST de finanzas-app (NestJS, Drizzle ORM, Postgres, Supabase Auth). Arquitectura hexagonal por módulo (`perfil`, `categorias`, `transacciones`, `health`).

## Requisitos

Node 22+, Docker.

## Puesta en marcha local

```bash
cp .env.example .env        # completa SUPABASE_URL con tu proyecto
docker compose up -d        # Postgres 16: bases `finanzas` y `finanzas_test`
npm ci
DATABASE_URL=postgres://finanzas:finanzas@localhost:5432/finanzas npm run build && npm run db:migrate
npm run start:dev           # http://localhost:3001 (Swagger UI en /docs)
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión a Postgres de la app. |
| `DATABASE_URL_TEST` | Postgres para los tests e2e (sólo desarrollo). |
| `SUPABASE_URL` | URL del proyecto Supabase; de ahí se obtienen las claves (JWKS) para validar el JWT. |
| `FRONT_URL` | Origen del front; es el único permitido por CORS. |
| `PORT` | Puerto HTTP (por defecto `3001`). |

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

El esquema está en `src/db/schema.ts`. Tras cambiarlo: `npm run db:generate` y commitea la carpeta `drizzle/`. `npm run db:migrate` aplica las migraciones pendientes (requiere `npm run build` previo y `DATABASE_URL`).

## Despliegue en Railway

1. Crea un servicio desde este repo; Railway detecta el `Dockerfile`.
2. Añade un Postgres y define las variables `DATABASE_URL`, `SUPABASE_URL` y `FRONT_URL` (la URL pública del front). Railway aporta `PORT`.
3. Comando previo al arranque (Pre-deploy command): `npm run db:migrate`.
4. El healthcheck es `GET /health`.
