import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 只保留 DTO 里声明过的字段
      forbidNonWhitelisted: true, // 出现未声明字段直接 400
      transform: true, // 把 payload 转成 DTO class 实例
    }),
  );

  await app.listen(3001);
}
void bootstrap();
