import { ValidationPipe } from '@nestjs/common';

export const crearPipeValidacion = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
