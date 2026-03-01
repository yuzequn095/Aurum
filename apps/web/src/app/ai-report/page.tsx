'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function AiReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const yearOptions = useMemo(() => [year, year - 1, year - 2], [year]);

  return (
    <Container className='py-8 space-y-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>AI Report</h1>
        <p className='text-sm text-aurum-muted'>Monthly insights generated from your transactions.</p>
      </header>

      <Section title='Period'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <label className='space-y-2 text-sm text-aurum-muted'>
                Year
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className='space-y-2 text-sm text-aurum-muted'>
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {monthNames.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title='Overview'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-6'>
            <div className='rounded-[12px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 p-4 text-sm text-aurum-muted'>
              Overview placeholder: monthly AI summary will appear here.
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title='Insights'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-6'>
            <div className='space-y-3'>
              <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4 text-sm text-aurum-muted'>
                Insight placeholder #1
              </div>
              <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4 text-sm text-aurum-muted'>
                Insight placeholder #2
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title='Category Breakdown'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[220px] rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner' />
          </CardContent>
        </Card>
      </Section>
    </Container>
  );
}
