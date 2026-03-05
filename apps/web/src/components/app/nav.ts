export type AppNavItem = {
  label: string;
  href: '/dashboard' | '/portfolio' | '/transactions' | '/ai-insights';
};

export const SETTINGS_HREF = '/settings' as const;

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'AI Insights', href: '/ai-insights' },
];

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
