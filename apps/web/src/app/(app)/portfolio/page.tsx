import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function PortfolioPage() {
  return (
    <PageContainer className='space-y-6'>
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
    </PageContainer>
  );
}
