import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type AuthResponse = {
  user: { id: string; email: string };
  accessToken: string;
  refreshToken: string;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

describe('Auth lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let prisma: PrismaService;
  const userIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwtService = app.get(JwtService);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  async function register(): Promise<AuthResponse> {
    const email = `auth-${randomUUID()}@aurum.local`;
    const response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password: 'synthetic-password-17d' })
      .expect(201);
    const body = response.body as AuthResponse;
    userIds.push(body.user.id);
    return body;
  }

  function refresh(refreshToken: string): Promise<Response> {
    return request(app.getHttpServer())
      .post('/v1/auth/refresh')
      .send({ refreshToken });
  }

  it('registers and logs in with the documented response shape', async () => {
    const first = await register();
    expect(first.user.email).toContain('@aurum.local');
    expect(first.accessToken).toEqual(expect.any(String));
    expect(first.refreshToken).toEqual(expect.any(String));

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: first.user.email, password: 'synthetic-password-17d' })
      .expect(201);
    expect(login.body).toMatchObject({
      user: { id: first.user.id, email: first.user.email },
      accessToken: expect.any(String) as string,
      refreshToken: expect.any(String) as string,
    });

    await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: first.user.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rotates a valid refresh token and treats reuse as family compromise', async () => {
    const first = await register();
    const rotation = await refresh(first.refreshToken);
    expect(rotation.status).toBe(201);
    const rotated = rotation.body as RefreshResponse;
    expect(rotated.accessToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).not.toBe(first.refreshToken);

    await refresh(first.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
    await refresh(rotated.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
  });

  it('rejects logout-revoked, invalid, and expired refresh credentials', async () => {
    const session = await register();
    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(201)
      .expect({ ok: true });
    await refresh(session.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
    await refresh('not-a-jwt').then((response) =>
      expect(response.status).toBe(401),
    );

    const expired = await jwtService.signAsync(
      { userId: session.user.id, email: session.user.email },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: -1,
        jwtid: randomUUID(),
      },
    );
    await refresh(expired).then((response) =>
      expect(response.status).toBe(401),
    );
  });

  it('logout-all revokes every current refresh session for the user', async () => {
    const first = await register();
    const secondLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: first.user.email, password: 'synthetic-password-17d' })
      .expect(201);
    const second = secondLogin.body as AuthResponse;

    await request(app.getHttpServer())
      .post('/v1/auth/logout-all')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(201)
      .expect({ ok: true });

    await refresh(first.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
    await refresh(second.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
  });

  it('preserves strict reuse detection when two backend rotations race', async () => {
    const first = await register();
    const results = await Promise.all([
      refresh(first.refreshToken),
      refresh(first.refreshToken),
    ]);
    const success = results.find((response) => response.status === 201);

    expect(results.map((response) => response.status).sort()).toEqual([
      201, 401,
    ]);
    expect(success).toBeDefined();
    const rotated = success?.body as RefreshResponse;
    await refresh(rotated.refreshToken).then((response) =>
      expect(response.status).toBe(401),
    );
  });
});
