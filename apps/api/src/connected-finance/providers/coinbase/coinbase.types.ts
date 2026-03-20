import type {
  CryptoAccountNormalizedInput,
  CryptoBalanceNormalizedInput,
} from '@aurum/core';

export interface CoinbaseSourceSecretPayload extends Record<string, unknown> {
  apiKeyName: string;
  apiPrivateKey: string;
}

export interface CoinbaseConnectedAccount extends CryptoAccountNormalizedInput {
  assetId?: string;
  primary?: boolean;
  ready?: boolean;
}

export interface CoinbaseBalance extends CryptoBalanceNormalizedInput {
  assetType?: 'crypto' | 'fiat';
}
