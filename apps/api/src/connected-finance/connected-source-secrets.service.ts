import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EncryptedEnvelope = {
  iv: string;
  tag: string;
  ciphertext: string;
};

@Injectable()
export class ConnectedSourceSecretsService {
  constructor(private readonly configService: ConfigService) {}

  encryptJson(payload: Record<string, unknown>): string {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const envelope: EncryptedEnvelope = {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };

    return `v1:${Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64')}`;
  }

  decryptJson<T extends Record<string, unknown>>(value: string): T {
    const [version, encodedEnvelope] = value.split(':', 2);
    if (version !== 'v1' || !encodedEnvelope) {
      throw new Error('Unsupported connected source secret payload format');
    }

    const parsed = JSON.parse(
      Buffer.from(encodedEnvelope, 'base64').toString('utf8'),
    ) as EncryptedEnvelope;
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(parsed.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(plaintext) as T;
  }

  private getEncryptionKey(): Buffer {
    const keyMaterial = this.configService
      .get<string>('CONNECTED_SOURCE_SECRET_KEY')
      ?.trim();

    if (!keyMaterial) {
      throw new Error('CONNECTED_SOURCE_SECRET_KEY is required');
    }

    // v1 assumption: the app-level secret is stored outside the database and
    // is stretched into a 32-byte AES key via SHA-256 for encryption at rest.
    return createHash('sha256').update(keyMaterial, 'utf8').digest();
  }
}
