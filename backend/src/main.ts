import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // LAN-only dashboard: permissive CORS is intentional, no need to restrict origins.
  app.enableCors();
  // Global validation: reject unknown/invalid query & body fields with 400,
  // and auto-convert query string params (e.g. "page=2") to their DTO types.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(3000);
  console.log('Backend listening on port 3000');
}

void bootstrap();
