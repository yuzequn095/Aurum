import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';
import { KpiCard } from './components/kpi-card';

export default function DashboardPage() {
  return (
    <Container className='py-8 space-y-8'>
      <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>Dashboard</h1>

      <Section title='Period'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <label className='space-y-2 text-sm text-aurum-muted'>
                Year
                <select className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'>
                  <option>2026</option>
                  <option>2025</option>
                  <option>2024</option>
                </select>
              </label>

              <label className='space-y-2 text-sm text-aurum-muted'>
                Month
                <select className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'>
                  <option>January</option>
                  <option>February</option>
                  <option>March</option>
                </select>
              </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <section className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        <KpiCard title='Income' value='$8,240.00' delta='+12.4% vs last month' positive />
        <KpiCard title='Expense' value='$5,120.00' delta='+4.2% vs last month' positive={false} />
        <KpiCard title='Net Cashflow' value='$3,120.00' delta='+26.1% vs last month' positive />
      </section>

      <Section>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[200px] rounded-[14px] border border-aurum-border bg-aurum-primarySoft/40' />
          </CardContent>
        </Card>
      </Section>
    </Container>
  );
}
