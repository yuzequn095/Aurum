import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type KpiCardProps = {
  title: string;
  value: string;
  deltaText: string;
  tone: 'positive' | 'negative' | 'neutral';
  emphasized?: boolean;
};

const toneClasses: Record<KpiCardProps['tone'], string> = {
  positive: 'text-aurum-success',
  negative: 'text-aurum-danger',
  neutral: 'text-aurum-muted',
};

export function KpiCard({ title, value, deltaText, tone, emphasized = false }: KpiCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden rounded-[14px] bg-white/80 shadow-aurumSm backdrop-blur transition hover:shadow-xl",
        emphasized && "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-aurum-primary before:content-['']",
      )}
    >
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm text-aurum-muted'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='relative space-y-2'>
          <div className='absolute -right-6 -top-6 h-24 w-24 rounded-full bg-aurum-primarySoft blur-2xl opacity-40' />
          <p className='text-2xl font-semibold text-aurum-text'>{value}</p>
          <p className={cn('text-sm font-medium', toneClasses[tone])}>{deltaText}</p>
        </div>
      </CardContent>
    </Card>
  );
}
