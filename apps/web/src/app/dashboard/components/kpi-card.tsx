import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type KpiCardProps = {
  title: string;
  value: string;
  deltaText: string;
  tone: 'positive' | 'negative' | 'neutral';
};

const toneClasses: Record<KpiCardProps['tone'], string> = {
  positive: 'text-aurum-success',
  negative: 'text-aurum-danger',
  neutral: 'text-aurum-muted',
};

export function KpiCard({ title, value, deltaText, tone }: KpiCardProps) {
  return (
    <Card className='relative overflow-hidden rounded-[14px] shadow-aurumSm transition hover:shadow-lg'>
      <div className='absolute right-4 top-4 h-12 w-12 rounded-full bg-gradient-to-br from-aurum-primary to-aurum-primaryHover opacity-80' />
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm text-aurum-muted'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-2'>
          <p className='text-2xl font-semibold text-aurum-text'>{value}</p>
          <p className={cn('text-sm font-medium', toneClasses[tone])}>{deltaText}</p>
        </div>
      </CardContent>
    </Card>
  );
}
