import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';
import { KpiCard } from './components/kpi-card';

export default function DashboardPage() {
  return (
    <Container className='py-8 space-y-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>Dashboard</h1>
        <p className='text-sm text-aurum-muted'>Monitor cashflow trends and monthly performance at a glance.</p>
      </header>

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
        <KpiCard title='Income' value='$8,240.00' deltaText='+12.4% vs last month' tone='positive' />
        <KpiCard title='Expense' value='$5,120.00' deltaText='+4.2% vs last month' tone='negative' />
        <KpiCard title='Net Cashflow' value='$3,120.00' deltaText='+26.1% vs last month' tone='positive' />
      </section>

      <section className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[200px] rounded-[14px] border border-aurum-border bg-aurum-primarySoft/40' />
          </CardContent>
        </Card>

        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[200px] rounded-[14px] border border-aurum-border bg-aurum-bg' />
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
