import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // LAN-only dashboard: permissive CORS is intentional, no need to restrict origins.
  app.enableCors();
  await app.listen(3000);
  console.log('Backend listening on port 3000');
}

void bootstrap();
