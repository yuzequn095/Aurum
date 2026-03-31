import { Badge, type BadgeProps } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export type HomeSummaryItem = {
  eyebrow: string;
  value: string;
  title: string;
  detail: string;
  badgeText?: string;
  badgeVariant?: BadgeProps['variant'];
};

type HomeSummaryGridProps = {
  items: HomeSummaryItem[];
  loading?: boolean;
};

export function HomeSummaryGrid({ items, loading }: HomeSummaryGridProps) {
  return (
    <section className='space-y-4'>
      <div className='space-y-1'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
          Wealth Summary
        </p>
        <h2 className='text-2xl font-semibold tracking-tight text-[var(--aurum-text)]'>
          The state of the system, at a glance
        </h2>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4'>
        {loading
          ? Array.from({ length: 4 }, (_, index) => (
              <Card key={index}>
                <CardContent className='space-y-4 pt-5'>
                  <Skeleton className='h-4 w-24 rounded-[10px]' />
                  <Skeleton className='h-10 w-36 rounded-[10px]' />
                  <Skeleton className='h-4 w-32 rounded-[10px]' />
                  <Skeleton className='h-8 w-28 rounded-full' />
                </CardContent>
              </Card>
            ))
          : items.map((item) => (
              <Card key={item.eyebrow} className='bg-[rgba(255,255,255,0.88)]'>
                <CardContent className='space-y-4 pt-5'>
                  <div className='space-y-2'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                      {item.eyebrow}
                    </p>
                    <div className='space-y-1'>
                      <p className='text-[30px] leading-none font-semibold tracking-tight text-[var(--aurum-text)]'>
                        {item.value}
                      </p>
                      <p className='text-sm font-medium text-[var(--aurum-text)]'>{item.title}</p>
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <p className='max-w-[18rem] text-sm leading-6 text-[var(--aurum-text-muted)]'>
                      {item.detail}
                    </p>
                    {item.badgeText ? (
                      <Badge variant={item.badgeVariant ?? 'neutral'}>{item.badgeText}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </section>
  );
}
