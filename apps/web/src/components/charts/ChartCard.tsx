import { PropsWithChildren } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

type ChartCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  className?: string;
}>;

export function ChartCard({ title, subtitle, className, children }: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='text-xl'>{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
