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
    <div className='flex items-center gap-7 border-b border-aurum-border/70 pb-2' role='tablist' aria-label='Authentication mode'>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            href={item.href}
            role='tab'
            aria-selected={active}
            className={cn(
              'relative py-1 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors',
              active
                ? 'text-aurum-text'
                : 'text-aurum-muted/70 hover:text-aurum-muted',
            )}
          >
            {item.label}
            {active ? <span className='absolute -bottom-[11px] left-0 h-[2px] w-full bg-aurum-primaryHover' /> : null}
          </Link>
        );
      })}
    </div>
  );
}
