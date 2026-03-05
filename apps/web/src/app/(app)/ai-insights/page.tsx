import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AiInsightsPage() {
  return (
    <div className='mx-auto w-full max-w-6xl space-y-6'>
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
    </div>
  );
}
