import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PortfolioPage() {
  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-aurum-muted'>
            Portfolio module is ready for milestone implementation. This page will host
            multi-account asset tracking, allocation views, and institution-connected updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
