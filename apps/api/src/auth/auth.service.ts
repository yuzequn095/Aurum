import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
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

  async register(email: string, password: string): Promise<AuthResponse> {
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

    const tokens = await this.issueTokens(user.id, normalizedEmail);

    return {
      user: {
        id: user.id,
        email: normalizedEmail,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
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

    if (!identity?.secretHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await compare(password, identity.secretHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(identity.userId, identity.identifier);

    return {
      user: {
        id: identity.userId,
        email: identity.identifier,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);

    const record = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!record) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    return {
      accessToken: await this.signAccessToken(payload),
    };
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { ok: true };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
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
