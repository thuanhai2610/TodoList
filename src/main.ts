import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const PORT = process.env.PORT || 3000;

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser())
  app.useGlobalInterceptors();
  app.use(express.urlencoded({extended: true}))
  await app.listen(
    PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`)

    }
  );
}
bootstrap();
