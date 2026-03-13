import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

function buildAllowedOrigins(): Set<string> {
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  const fromEnv = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return new Set([...defaults, ...fromEnv]);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = buildAllowedOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
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
