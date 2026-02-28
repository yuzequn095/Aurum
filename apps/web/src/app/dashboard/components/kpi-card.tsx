import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type KpiCardProps = {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
};

export function KpiCard({ title, value, delta, positive }: KpiCardProps) {
  return (
    <Card className='rounded-[14px] shadow-aurumSm'>
      <CardHeader>
        <CardTitle className='text-sm text-aurum-muted'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-1'>
          <p className='text-2xl font-semibold text-aurum-text'>{value}</p>
          <p className={cn('text-sm font-medium', positive ? 'text-aurum-success' : 'text-aurum-danger')}>{delta}</p>
        </div>
      </CardContent>
    </Card>
  );
}
