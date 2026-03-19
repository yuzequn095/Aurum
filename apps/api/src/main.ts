import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function buildAllowedOrigins(): Set<string> {
  const defaults = ['http://localhost:3000', 'http://127.0.0.1:3000'];

  const fromEnv = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return new Set([...defaults, ...fromEnv]);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = buildAllowedOrigins();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.enableCors({
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void,
      ) => {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin not allowed: ${origin}`), false);
      },
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3001);
}

void bootstrap();
