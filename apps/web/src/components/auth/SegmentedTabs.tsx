import Link from 'next/link';
import { cn } from '@/lib/cn';

type TabItem = {
  key: string;
  label: string;
  href: string;
};

type SegmentedTabsProps = {
  items: TabItem[];
  activeKey: string;
};

export function SegmentedTabs({ items, activeKey }: SegmentedTabsProps) {
  return (
    <div
      className='grid grid-cols-2 rounded-aurum border border-aurum-border bg-aurum-card p-1'
      role='tablist'
      aria-label='Authentication mode'
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            role='tab'
            aria-selected={active}
            className={cn(
              'rounded-[10px] px-3 py-2 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-aurum-primarySoft text-aurum-text shadow-aurumSm'
                : 'text-aurum-muted hover:text-aurum-text',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
