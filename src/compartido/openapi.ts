import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Nombre del esquema de seguridad; los controladores protegidos lo referencian. */
export const ESQUEMA_BEARER = 'bearer';

export function construirDocumento(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('finanzas-app API')
    .setDescription('API REST de finanzas personales')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ESQUEMA_BEARER,
    )
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Swagger UI en /docs, sólo fuera de producción. */
export function montarSwaggerUi(app: INestApplication, produccion: boolean) {
  if (produccion) return;
  SwaggerModule.setup('docs', app, construirDocumento(app));
}
