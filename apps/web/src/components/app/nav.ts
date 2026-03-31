export type AppNavItem = {
  label: string;
  mobileLabel: string;
  description: string;
  href: '/dashboard' | '/portfolio' | '/transactions' | '/ai-insights';
  icon: 'home' | 'portfolio' | 'transactions' | 'ai';
};

export type AppCommandAction = {
  label: string;
  description: string;
  href: string;
  icon: 'transactions' | 'ask' | 'chat' | 'analysis';
};

export const SETTINGS_HREF = '/settings' as const;

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    label: 'Dashboard',
    mobileLabel: 'Home',
    description: 'Overview, balances, and monthly performance.',
    href: '/dashboard',
    icon: 'home',
  },
  {
    label: 'Portfolio',
    mobileLabel: 'Portfolio',
    description: 'Connected accounts, holdings, and valuation history.',
    href: '/portfolio',
    icon: 'portfolio',
  },
  {
    label: 'Transactions',
    mobileLabel: 'Transactions',
    description: 'Ledger, categories, and transaction management.',
    href: '/transactions',
    icon: 'transactions',
  },
  {
    label: 'AI Insights',
    mobileLabel: 'AI',
    description: 'Reports, quick chat, and portfolio analysis workflows.',
    href: '/ai-insights',
    icon: 'ai',
  },
];

export const APP_COMMAND_ACTIONS: AppCommandAction[] = [
  {
    label: 'Add Transaction',
    description: 'Open the transaction composer from anywhere in the app shell.',
    href: '/transactions?action=create',
    icon: 'transactions',
  },
  {
    label: 'Ask AI',
    description: 'Jump into the AI Insights workspace and continue from the latest context.',
    href: '/ai-insights',
    icon: 'ask',
  },
  {
    label: 'Quick Chat',
    description: 'Open the saved and ephemeral Quick Chat workspace.',
    href: '/ai-insights#quick-chat-section',
    icon: 'chat',
  },
  {
    label: 'Quick Analysis',
    description: 'Go straight to the guided portfolio analysis launcher.',
    href: '/ai-insights#analysis-portfolio-analysis',
    icon: 'analysis',
  },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getNavTitle(pathname: string): string {
  if (pathname === SETTINGS_HREF || pathname.startsWith(`${SETTINGS_HREF}/`)) {
    return 'Settings';
  }

  const exact = APP_NAV_ITEMS.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const nested = APP_NAV_ITEMS.find(
    (item) => pathname.startsWith(`${item.href}/`) || pathname === item.href,
  );
  return nested?.label ?? 'Aurum';
}
