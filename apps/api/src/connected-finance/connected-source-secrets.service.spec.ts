import { ConfigService } from '@nestjs/config';
import { ConnectedSourceSecretsService } from './connected-source-secrets.service';

describe('ConnectedSourceSecretsService', () => {
  it('encrypts and decrypts provider payloads', () => {
    const service = new ConnectedSourceSecretsService(
      new ConfigService({
        CONNECTED_SOURCE_SECRET_KEY: 'test_connected_source_secret_key',
      }),
    );

    const encrypted = service.encryptJson({
      accessToken: 'access-sandbox-token',
      itemId: 'item_123',
    });
    const decrypted = service.decryptJson<{
      accessToken: string;
      itemId: string;
    }>(encrypted);

    expect(encrypted).not.toContain('access-sandbox-token');
    expect(decrypted).toEqual({
      accessToken: 'access-sandbox-token',
      itemId: 'item_123',
    });
  });
});
