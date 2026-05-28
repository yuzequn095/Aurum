import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSourceKind,
} from './connected-finance';
import type { PortfolioAssetCategory } from './types';

export interface ManualInstitutionAccountPreset {
  accountKey: string;
  displayName: string;
  accountType: string;
  assetType: PortfolioAssetCategory;
  assetSubType?: string;
  currency: string;
  metadata?: Record<string, unknown>;
}

export interface ManualInstitutionPreset {
  institutionKey: string;
  displayName: string;
  defaultSourceKind: Extract<ConnectedSourceKind, 'MANUAL_STATIC'>;
  baseCurrency: string;
  accounts: ManualInstitutionAccountPreset[];
}

export interface ManualInstitutionCreationResult {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
}

export const manualInstitutionPresets = [
  {
    institutionKey: 'wells_fargo',
    displayName: 'Wells Fargo',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'checking',
        displayName: 'Checking',
        accountType: 'Checking',
        assetType: 'cash',
        assetSubType: 'checking',
        currency: 'USD',
      },
      {
        accountKey: 'saving',
        displayName: 'Saving',
        accountType: 'Saving',
        assetType: 'cash',
        assetSubType: 'saving',
        currency: 'USD',
      },
    ],
  },
  {
    institutionKey: 'sofi',
    displayName: 'SoFi',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'cash',
        displayName: 'Cash',
        accountType: 'Cash',
        assetType: 'cash',
        assetSubType: 'cash',
        currency: 'USD',
      },
    ],
  },
  {
    institutionKey: 'webull',
    displayName: 'Webull',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'cash',
        displayName: 'Cash',
        accountType: 'Cash',
        assetType: 'cash',
        assetSubType: 'brokerage_cash',
        currency: 'USD',
      },
      {
        accountKey: 'stock',
        displayName: 'Stock',
        accountType: 'Stock',
        assetType: 'equity',
        assetSubType: 'taxable_brokerage',
        currency: 'USD',
      },
    ],
  },
  {
    institutionKey: 'tiger_brokers',
    displayName: 'Tiger Brokers',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'cash',
        displayName: 'Cash',
        accountType: 'Cash',
        assetType: 'cash',
        assetSubType: 'brokerage_cash',
        currency: 'USD',
      },
      {
        accountKey: 'stock',
        displayName: 'Stock',
        accountType: 'Stock',
        assetType: 'equity',
        assetSubType: 'taxable_brokerage',
        currency: 'USD',
      },
    ],
  },
  {
    institutionKey: 'fidelity',
    displayName: 'Fidelity',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'cash',
        displayName: 'Cash',
        accountType: 'Cash',
        assetType: 'cash',
        assetSubType: 'cash',
        currency: 'USD',
      },
      {
        accountKey: 'shares',
        displayName: 'Shares',
        accountType: 'Shares',
        assetType: 'equity',
        assetSubType: 'brokerage_shares',
        currency: 'USD',
      },
      {
        accountKey: '401k',
        displayName: '401K',
        accountType: '401K',
        assetType: 'fund',
        assetSubType: 'retirement_401k',
        currency: 'USD',
      },
      {
        accountKey: 'rsu',
        displayName: 'RSU',
        accountType: 'Shares',
        assetType: 'equity',
        assetSubType: 'employer_rsu',
        currency: 'USD',
        metadata: {
          employerStockCandidate: true,
        },
      },
    ],
  },
  {
    institutionKey: 'coinbase',
    displayName: 'Coinbase',
    defaultSourceKind: 'MANUAL_STATIC',
    baseCurrency: 'USD',
    accounts: [
      {
        accountKey: 'usdc',
        displayName: 'USDC',
        accountType: 'USDC',
        assetType: 'cash',
        assetSubType: 'stablecoin_cash',
        currency: 'USD',
      },
      {
        accountKey: 'crypto',
        displayName: 'Crypto',
        accountType: 'Crypto',
        assetType: 'crypto',
        assetSubType: 'crypto_wallet',
        currency: 'USD',
      },
    ],
  },
] as const satisfies ManualInstitutionPreset[];

export type ManualInstitutionKey = (typeof manualInstitutionPresets)[number]['institutionKey'];

export function findManualInstitutionPreset(
  institutionKey: string,
): ManualInstitutionPreset | undefined {
  return manualInstitutionPresets.find((preset) => preset.institutionKey === institutionKey);
}
