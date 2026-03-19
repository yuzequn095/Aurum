import type {
  BankLinkTokenResult,
  BankSourceConnectionResult,
  BankSyncMaterializationResult,
  ConnectedSource,
  ConnectedSourceAccount,
  ManualStaticSnapshotMaterializationResult,
  ManualStaticValuation,
  PortfolioAssetCategory,
  PortfolioSnapshot,
} from '@aurum/core';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export interface CreateConnectedSourceRequest {
  kind: ConnectedSource['kind'];
  displayName: string;
  providerKey?: string;
  institutionName?: string;
  baseCurrency?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateConnectedSourceAccountRequest {
  displayName: string;
  accountType: string;
  currency?: string;
  assetType?: PortfolioAssetCategory;
  assetSubType?: string;
  institutionOrIssuer?: string;
  externalAccountId?: string;
  maskLast4?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export type UpdateConnectedSourceAccountRequest = Partial<CreateConnectedSourceAccountRequest>;

export interface CreateManualStaticValuationRequest {
  valuationDate: string;
  currency?: string;
  marketValue: number;
  quantity?: number;
  unitPrice?: number;
  symbol?: string;
  assetName?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface ExchangePlaidPublicTokenRequest {
  publicToken: string;
  metadata?: {
    institution?: {
      institutionId?: string;
      institutionName?: string;
    };
    accounts?: Array<{
      id: string;
      name?: string;
      mask?: string;
      subtype?: string;
      type?: string;
    }>;
    linkSessionId?: string;
  };
}

export async function listConnectedSources(
  kind?: ConnectedSource['kind'],
): Promise<ConnectedSource[]> {
  const qs = new URLSearchParams();
  if (kind) {
    qs.set('kind', kind);
  }

  const suffix = qs.size > 0 ? `?${qs.toString()}` : '';
  return apiGet<ConnectedSource[]>(`/v1/connected-finance/sources${suffix}`);
}

export async function createConnectedSource(
  body: CreateConnectedSourceRequest,
): Promise<ConnectedSource> {
  return apiPost<ConnectedSource>('/v1/connected-finance/sources', body);
}

export async function createPlaidLinkToken(): Promise<BankLinkTokenResult> {
  return apiPost<BankLinkTokenResult>('/v1/connected-finance/bank/plaid/link-token', {});
}

export async function exchangePlaidPublicToken(
  body: ExchangePlaidPublicTokenRequest,
): Promise<BankSourceConnectionResult> {
  return apiPost<BankSourceConnectionResult>(
    '/v1/connected-finance/bank/plaid/exchange-public-token',
    body,
  );
}

export async function listConnectedSourceAccounts(
  sourceId: string,
): Promise<ConnectedSourceAccount[]> {
  return apiGet<ConnectedSourceAccount[]>(`/v1/connected-finance/sources/${sourceId}/accounts`);
}

export async function createConnectedSourceAccount(
  sourceId: string,
  body: CreateConnectedSourceAccountRequest,
): Promise<ConnectedSourceAccount> {
  return apiPost<ConnectedSourceAccount>(
    `/v1/connected-finance/sources/${sourceId}/accounts`,
    body,
  );
}

export async function updateConnectedSourceAccount(
  accountId: string,
  body: UpdateConnectedSourceAccountRequest,
): Promise<ConnectedSourceAccount> {
  return apiPatch<ConnectedSourceAccount>(`/v1/connected-finance/accounts/${accountId}`, body);
}

export async function listManualStaticValuations(
  accountId: string,
): Promise<ManualStaticValuation[]> {
  return apiGet<ManualStaticValuation[]>(
    `/v1/connected-finance/accounts/${accountId}/manual-valuations`,
  );
}

export async function createManualStaticValuation(
  accountId: string,
  body: CreateManualStaticValuationRequest,
): Promise<ManualStaticValuation> {
  return apiPost<ManualStaticValuation>(
    `/v1/connected-finance/accounts/${accountId}/manual-valuations`,
    body,
  );
}

export async function materializeManualStaticSnapshot(
  sourceId: string,
  snapshotDate?: string,
): Promise<ManualStaticSnapshotMaterializationResult> {
  return apiPost<ManualStaticSnapshotMaterializationResult>(
    `/v1/connected-finance/sources/${sourceId}/materialize-snapshot`,
    snapshotDate ? { snapshotDate } : {},
  );
}

export async function listConnectedSourceSnapshots(sourceId: string): Promise<PortfolioSnapshot[]> {
  return apiGet<PortfolioSnapshot[]>(`/v1/connected-finance/sources/${sourceId}/snapshots`);
}

export async function syncConnectedBankSource(
  sourceId: string,
): Promise<BankSyncMaterializationResult> {
  return apiPost<BankSyncMaterializationResult>(
    `/v1/connected-finance/sources/${sourceId}/sync`,
    {},
  );
}
