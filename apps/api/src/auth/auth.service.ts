import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';

type AuthResponse = {
  user: {
    id: string;
    email: string;
  };
  accessToken: string;
  refreshToken: string;
};

type ClientMeta = {
  userAgent?: string;
  ip?: string;
};

type Duration = {
  milliseconds: number;
  seconds: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    email: string,
    password: string,
    meta?: ClientMeta,
  ): Promise<AuthResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const existing = await this.prisma.authIdentity.findUnique({
      where: {
        provider_identifier: {
          provider: AuthProvider.EMAIL,
          identifier: normalizedEmail,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const secretHash = await hash(password, 12);
    const user = await this.prisma.user.create({
      data: {
        identities: {
          create: {
            provider: AuthProvider.EMAIL,
            identifier: normalizedEmail,
            secretHash,
          },
        },
      },
      select: { id: true },
    });

    const tokens = await this.issueTokens(user.id, normalizedEmail, meta);

    return {
      user: {
        id: user.id,
        email: normalizedEmail,
      },
      ...tokens,
    };
  }

  async login(
    email: string,
    password: string,
    meta?: ClientMeta,
  ): Promise<AuthResponse> {
    const normalizedEmail = this.normalizeEmail(email);
    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_identifier: {
          provider: AuthProvider.EMAIL,
          identifier: normalizedEmail,
        },
      },
      select: {
        userId: true,
        identifier: true,
        secretHash: true,
      },
    });

    if (!identity) {
      throw new UnauthorizedException('Invalid credentials');
    }
    this.assertEmailPasswordIdentity(identity.secretHash);

    const passwordOk = await compare(password, identity.secretHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(
      identity.userId,
      identity.identifier,
      meta,
    );

    return {
      user: {
        id: identity.userId,
        email: identity.identifier,
      },
      ...tokens,
    };
  }

  async refresh(
    refreshToken: string,
    meta?: ClientMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const sessionPayload: JwtPayload = {
      userId: payload.userId,
      email: payload.email,
    };
    const tokenHash = this.hashToken(refreshToken);
    const now = new Date();

    const oldRecord = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: sessionPayload.userId,
      },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!oldRecord) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (oldRecord.revokedAt || oldRecord.expiresAt <= now) {
      await this.revokeAllUserRefreshTokens(sessionPayload.userId);
      throw new UnauthorizedException('Refresh token reused');
    }

    const refreshTtl = this.getRequiredEnv('JWT_REFRESH_TTL');
    const [accessToken, newRefreshToken] = await Promise.all([
      this.signAccessToken(sessionPayload),
      this.signRefreshToken(sessionPayload),
    ]);

    const newRefreshExpiresAt = new Date(
      Date.now() + this.parseDuration(refreshTtl).milliseconds,
    );

    try {
      const newRecordId = await this.prisma.$transaction(async (tx) => {
        const created = await tx.refreshToken.create({
          data: {
            userId: sessionPayload.userId,
            tokenHash: this.hashToken(newRefreshToken),
            parentTokenId: oldRecord.id,
            expiresAt: newRefreshExpiresAt,
            userAgent: meta?.userAgent,
            ip: meta?.ip,
          },
          select: {
            id: true,
          },
        });

        const updateOld = await tx.refreshToken.updateMany({
          where: {
            id: oldRecord.id,
            userId: sessionPayload.userId,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          data: {
            revokedAt: now,
            replacedByTokenId: created.id,
          },
        });

        if (updateOld.count !== 1) {
          throw new UnauthorizedException('Refresh token reused');
        }

        return created.id;
      });

      if (!newRecordId) {
        throw new UnauthorizedException('Refresh token reused');
      }
    } catch {
      await this.revokeAllUserRefreshTokens(sessionPayload.userId);
      throw new UnauthorizedException('Refresh token reused');
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        userId: payload.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { ok: true };
  }

  async logoutAll(userId: string): Promise<{ ok: true }> {
    await this.revokeAllUserRefreshTokens(userId);
    return { ok: true };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertEmailPasswordIdentity(
    secretHash: string | null,
  ): asserts secretHash is string {
    if (!secretHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRequiredEnv(name: string): string {
    const value = this.configService.get<string>(name);
    if (!value) {
      throw new Error(`${name} is required`);
    }
    return value;
  }

  private async issueTokens(
    userId: string,
    email: string,
    meta?: ClientMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { userId, email };
    const refreshTtl = this.getRequiredEnv('JWT_REFRESH_TTL');

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(payload),
      this.signRefreshToken(payload),
    ]);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(
          Date.now() + this.parseDuration(refreshTtl).milliseconds,
        ),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });

    return { accessToken, refreshToken };
  }

  private signAccessToken(payload: JwtPayload): Promise<string> {
    const accessTtl = this.getRequiredEnv('JWT_ACCESS_TTL');
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
      expiresIn: this.parseDuration(accessTtl).seconds,
    });
  }

  private signRefreshToken(payload: JwtPayload): Promise<string> {
    const refreshTtl = this.getRequiredEnv('JWT_REFRESH_TTL');
    return this.jwtService.signAsync(payload, {
      secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      expiresIn: this.parseDuration(refreshTtl).seconds,
      jwtid: randomUUID(),
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private parseDuration(ttl: string): Duration {
    const match = ttl.trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
      throw new Error(`Unsupported JWT_REFRESH_TTL format: ${ttl}`);
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const millisecondsByUnit: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    const milliseconds = value * millisecondsByUnit[unit];
    return {
      milliseconds,
      seconds: Math.floor(milliseconds / 1000),
    };
  }
}
