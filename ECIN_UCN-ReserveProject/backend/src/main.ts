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

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const mobileFrontendUrl = process.env.MOBILE_FRONTEND_URL;

  const allowedOrigins = [
    frontendUrl,
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:19006',
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
