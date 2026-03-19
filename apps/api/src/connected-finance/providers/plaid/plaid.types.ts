import type {
  BankAccountNormalizedInput,
  BankBalanceNormalizedInput,
} from '@aurum/core';

export interface PlaidInstitutionMetadata {
  institutionId?: string;
  institutionName?: string;
}

export interface PlaidLinkSuccessAccountMetadata {
  id: string;
  name?: string;
  mask?: string;
  subtype?: string;
  type?: string;
}

export interface PlaidExchangePublicTokenMetadata {
  institution?: PlaidInstitutionMetadata;
  accounts?: PlaidLinkSuccessAccountMetadata[];
  linkSessionId?: string;
}

export interface PlaidLinkTokenResult {
  linkToken: string;
  expiration?: string;
  requestId?: string;
}

export interface PlaidExchangeResult {
  accessToken: string;
  itemId: string;
  requestId?: string;
}

export interface PlaidLinkedAccount
  extends BankAccountNormalizedInput, BankBalanceNormalizedInput {}

export interface PlaidAccountsResult {
  itemId?: string;
  institution?: PlaidInstitutionMetadata;
  accounts: PlaidLinkedAccount[];
  requestId?: string;
}

export interface PlaidSourceSecretPayload extends Record<string, unknown> {
  accessToken: string;
  itemId: string;
  institutionId?: string;
  institutionName?: string;
}
