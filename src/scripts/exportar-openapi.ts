import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { construirDocumento } from '../compartido/openapi.js';

// Valores ficticios: el cliente de postgres y el JWKS son perezosos, así que
// construir el documento no abre ninguna conexión.
process.env.DATABASE_URL ??= 'postgres://x:x@localhost:5432/x';
process.env.SUPABASE_URL ??= 'https://ejemplo.supabase.co';
process.env.FRONT_URL ??= 'http://localhost:3000';

const app = await NestFactory.create(AppModule, { logger: false });
const salida = resolve(process.cwd(), 'openapi.json');
writeFileSync(salida, JSON.stringify(construirDocumento(app), null, 2) + '\n');
await app.close();
console.log(`openapi.json escrito en ${salida}`);
