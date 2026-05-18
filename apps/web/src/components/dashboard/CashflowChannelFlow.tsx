'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/format';
import type { CashflowChannel } from '@/hooks/useCashflowChannels';

type CashflowChannelFlowProps = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  incomeChannels: CashflowChannel[];
  expenseChannels: CashflowChannel[];
  monthLabel: string;
  loading?: boolean;
  error?: string | null;
};

type FlowNode = {
  label: string;
  amountCents: number;
  tone?: 'income' | 'expense' | 'reserve' | 'saved';
};

const sampleIncomeChannels: FlowNode[] = [
  { label: 'Salary', amountCents: 850000, tone: 'income' },
  { label: 'Consulting', amountCents: 225000, tone: 'income' },
  { label: 'Dividends', amountCents: 125000, tone: 'income' },
];

const sampleExpenseChannels: FlowNode[] = [
  { label: 'Housing', amountCents: 320000, tone: 'expense' },
  { label: 'Essentials', amountCents: 145000, tone: 'expense' },
  { label: 'Lifestyle', amountCents: 97500, tone: 'expense' },
  { label: 'Subscriptions', amountCents: 42500, tone: 'expense' },
];

const sampleNetCents = 395000;

function sum(nodes: FlowNode[]) {
  return nodes.reduce((total, node) => total + node.amountCents, 0);
}

function compactNodes(nodes: FlowNode[], maxItems: number, otherLabel: string): FlowNode[] {
  const clean = nodes.filter((node) => node.amountCents > 0);
  if (clean.length <= maxItems) return clean;

  const visible = clean.slice(0, maxItems - 1);
  const otherAmount = sum(clean.slice(maxItems - 1));
  return [...visible, { label: otherLabel, amountCents: otherAmount, tone: clean[0]?.tone }];
}

function reconcileNodes(
  channels: CashflowChannel[],
  totalCents: number,
  fallbackLabel: string,
  otherLabel: string,
  tone: FlowNode['tone'],
): FlowNode[] {
  if (totalCents <= 0) return [];

  const base = channels
    .filter((channel) => channel.amountCents > 0)
    .map((channel) => ({
      label: channel.label,
      amountCents: channel.amountCents,
      tone,
    }));

  if (base.length === 0) {
    return [{ label: fallbackLabel, amountCents: totalCents, tone }];
  }

  const baseTotal = sum(base);
  if (baseTotal > totalCents && baseTotal > 0) {
    const factor = totalCents / baseTotal;
    return compactNodes(
      base.map((node) => ({
        ...node,
        amountCents: Math.max(1, Math.round(node.amountCents * factor)),
      })),
      4,
      otherLabel,
    );
  }

  const gap = totalCents - baseTotal;
  const reconciled =
    gap > 0 ? [...base, { label: otherLabel, amountCents: gap, tone }] : base;
  return compactNodes(reconciled, 4, otherLabel);
}

function distributeY(count: number, top: number, bottom: number) {
  if (count <= 1) return [(top + bottom) / 2];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, index) => top + step * index);
}

function getStroke(tone: FlowNode['tone']) {
  if (tone === 'saved') return 'rgba(212, 175, 55, 0.88)';
  if (tone === 'reserve') return 'rgba(27, 156, 100, 0.48)';
  if (tone === 'income') return 'rgba(212, 175, 55, 0.66)';
  return 'rgba(115, 112, 107, 0.18)';
}

function getDot(tone: FlowNode['tone']) {
  if (tone === 'saved') return 'bg-[var(--aurum-accent)]';
  if (tone === 'reserve') return 'bg-[var(--aurum-success)]';
  if (tone === 'income') return 'bg-[var(--aurum-accent)]/80';
  return 'bg-[var(--aurum-border)]';
}

function getStrokeWidth(amountCents: number, maxAmountCents: number) {
  if (maxAmountCents <= 0) return 4;
  return Math.max(4, Math.min(22, 4 + Math.sqrt(amountCents / maxAmountCents) * 18));
}

function NodeList({ title, nodes }: { title: string; nodes: FlowNode[] }) {
  const total = sum(nodes);

  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
        {title}
      </p>
      <div className='space-y-2'>
        {nodes.map((node) => (
          <div
            key={`${title}-${node.label}`}
            className='rounded-[16px] border border-[var(--aurum-border)] bg-white px-3 py-2.5'
          >
            <div className='flex items-center justify-between gap-3'>
              <span className='inline-flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--aurum-text)]'>
                <span className={`h-2 w-2 shrink-0 rounded-full ${getDot(node.tone)}`} />
                <span className='truncate'>{node.label}</span>
              </span>
              <span className='shrink-0 text-sm font-semibold text-[var(--aurum-text)]'>
                {formatMoney(node.amountCents)}
              </span>
            </div>
            <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--aurum-surface-alt)]'>
              <div
                className='h-full rounded-full bg-[var(--aurum-accent)]'
                style={{ width: `${total > 0 ? Math.max(8, (node.amountCents / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashflowChannelFlow({
  incomeCents,
  expenseCents,
  netCents,
  incomeChannels,
  expenseChannels,
  monthLabel,
  loading,
  error,
}: CashflowChannelFlowProps) {
  const hasLiveFlow = incomeCents > 0 && expenseCents > 0 && !error;
  const usingSample = !loading && !hasLiveFlow;

  const liveSources = reconcileNodes(
    incomeChannels,
    incomeCents,
    'Recorded income',
    'Other income',
    'income',
  );
  const liveExpenses = reconcileNodes(
    expenseChannels,
    expenseCents,
    'Recorded spending',
    'Other spending',
    'expense',
  );
  const liveReserve =
    netCents < 0
      ? [{ label: 'Reserve drawdown', amountCents: Math.abs(netCents), tone: 'reserve' as const }]
      : [];
  const liveSaved =
    netCents > 0
      ? [{ label: 'Saved / invested', amountCents: netCents, tone: 'saved' as const }]
      : [];

  const sources = usingSample ? sampleIncomeChannels : [...liveSources, ...liveReserve];
  const destinations = usingSample
    ? [...sampleExpenseChannels, { label: 'Saved / invested', amountCents: sampleNetCents, tone: 'saved' as const }]
    : [...liveExpenses, ...liveSaved];

  const sourceTotal = sum(sources);
  const maxAmount = Math.max(...sources.map((node) => node.amountCents), ...destinations.map((node) => node.amountCents), 1);
  const sourceY = distributeY(sources.length, 68, 230);
  const destinationY = distributeY(destinations.length, 58, 238);
  const displayedNetCents = usingSample ? sampleNetCents : netCents;

  return (
    <section className='rounded-[28px] border border-[var(--aurum-border)] bg-white p-4 shadow-[var(--aurum-shadow)] sm:p-5'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Cashflow Channels
            </p>
            <span className='rounded-full border border-[var(--aurum-border)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--aurum-text-muted)]'>
              {usingSample ? 'Sample model' : 'Live month'}
            </span>
          </div>
          <h3 className='text-2xl font-semibold tracking-tight text-[var(--aurum-text)]'>
            Where money enters and leaves
          </h3>
          <p className='max-w-2xl text-sm leading-7 text-[var(--aurum-text-muted)]'>
            {usingSample
              ? 'Previewing the complete flow treatment with sample channels until this month has both income and spending records.'
              : `${monthLabel} channels are grouped from transaction categories so income sources, spending paths, and retained cash stay visible together.`}
          </p>
        </div>

        <div className='grid grid-cols-3 gap-2 sm:min-w-[360px]'>
          <div className='rounded-[18px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              Inflow
            </p>
            <p className='mt-1 text-base font-semibold text-[var(--aurum-text)]'>
              {formatMoney(sourceTotal)}
            </p>
          </div>
          <div className='rounded-[18px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              Outflow
            </p>
            <p className='mt-1 text-base font-semibold text-[var(--aurum-text)]'>
              {formatMoney(usingSample ? sum(sampleExpenseChannels) : expenseCents)}
            </p>
          </div>
          <div className='rounded-[18px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              {displayedNetCents >= 0 ? 'Retained' : 'Shortfall'}
            </p>
            <p className='mt-1 text-base font-semibold text-[var(--aurum-text)]'>
              {formatMoney(Math.abs(displayedNetCents))}
            </p>
          </div>
        </div>
      </div>

      <div className='mt-5'>
        {loading ? (
          <Skeleton className='h-[340px] rounded-[24px]' />
        ) : (
          <>
            <div className='hidden rounded-[24px] border border-[var(--aurum-border)] bg-white p-4 sm:block'>
              <svg
                role='img'
                aria-label='Monthly cashflow channel flow'
                viewBox='0 0 720 300'
                className='h-[300px] w-full overflow-visible'
              >
                <defs>
                  <filter id='aurum-flow-soft-shadow' x='-20%' y='-20%' width='140%' height='140%'>
                    <feDropShadow dx='0' dy='10' stdDeviation='12' floodColor='rgba(17,24,39,0.08)' />
                  </filter>
                </defs>

                <rect x='292' y='112' width='136' height='76' rx='22' fill='#ffffff' stroke='#e8e8e8' filter='url(#aurum-flow-soft-shadow)' />
                <text x='360' y='142' textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Monthly Flow
                </text>
                <text x='360' y='166' textAnchor='middle' className='fill-[var(--aurum-text)] text-[18px] font-semibold'>
                  {formatMoney(usingSample ? sourceTotal : incomeCents)}
                </text>

                {sources.map((node, index) => {
                  const y = sourceY[index];
                  const strokeWidth = getStrokeWidth(node.amountCents, maxAmount);
                  return (
                    <g key={`source-${node.label}`}>
                      <path
                        d={`M 178 ${y} C 230 ${y}, 245 150, 292 150`}
                        fill='none'
                        stroke={getStroke(node.tone)}
                        strokeLinecap='round'
                        strokeWidth={strokeWidth}
                      />
                      <circle cx='178' cy={y} r='4' fill={node.tone === 'reserve' ? '#1b9c64' : '#d4af37'} />
                      <text x='28' y={y - 6} className='fill-[var(--aurum-text)] text-[12px] font-semibold'>
                        {node.label}
                      </text>
                      <text x='28' y={y + 13} className='fill-[var(--aurum-text-muted)] text-[11px]'>
                        {formatMoney(node.amountCents)}
                      </text>
                    </g>
                  );
                })}

                {destinations.map((node, index) => {
                  const y = destinationY[index];
                  const strokeWidth = getStrokeWidth(node.amountCents, maxAmount);
                  return (
                    <g key={`destination-${node.label}`}>
                      <path
                        d={`M 428 150 C 476 150, 486 ${y}, 538 ${y}`}
                        fill='none'
                        stroke={getStroke(node.tone)}
                        strokeLinecap='round'
                        strokeWidth={strokeWidth}
                      />
                      <circle cx='538' cy={y} r='4' fill={node.tone === 'saved' ? '#d4af37' : '#d9d9d9'} />
                      <text x='558' y={y - 6} className='fill-[var(--aurum-text)] text-[12px] font-semibold'>
                        {node.label}
                      </text>
                      <text x='558' y={y + 13} className='fill-[var(--aurum-text-muted)] text-[11px]'>
                        {formatMoney(node.amountCents)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:hidden'>
              <NodeList title='Income channels' nodes={sources} />
              <NodeList title='Expense and retained channels' nodes={destinations} />
            </div>

            {error ? (
              <p className='mt-3 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-2 text-sm text-[var(--aurum-text-muted)]'>
                Live channel data is temporarily unavailable, so this card is showing sample flow
                structure.
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
