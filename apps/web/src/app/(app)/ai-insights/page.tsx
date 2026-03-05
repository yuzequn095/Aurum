import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AiInsightsPage() {
  return (
    <PageContainer className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-aurum-muted'>
            AI Insights is the financial intelligence center. Upcoming milestones will add
            persistent conversations, report timelines, and actionable guidance cards.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
