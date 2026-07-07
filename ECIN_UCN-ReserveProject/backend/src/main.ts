import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL || 'https://romantic-heart-production-7963.up.railway.app';
  const mobileFrontendUrl = process.env.MOBILE_FRONTEND_URL || 'https://gregarious-renewal-production-88f0.up.railway.app';

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
    frontendUrl,
  ];
  if (mobileFrontendUrl) {
    allowedOrigins.push(mobileFrontendUrl);
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
