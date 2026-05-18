'use client';

import { Skeleton } from '@/components/ui/Skeleton';
import type { CashflowChannel } from '@/hooks/useCashflowChannels';
import { formatMoney } from '@/lib/format';

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

type FlowTone = 'income' | 'expense' | 'reserve' | 'saved';

type FlowNode = {
  label: string;
  amountCents: number;
  tone?: FlowTone;
};

type FlowAnchor = FlowNode & {
  y: number;
  width: number;
  share: number;
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

const sampleNetCents = 595000;

const chart = {
  width: 900,
  height: 370,
  leftLabelX: 42,
  leftNodeX: 214,
  centerLeftX: 402,
  centerRightX: 548,
  rightNodeX: 692,
  rightLabelX: 724,
  centerY: 190,
};

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
  tone: FlowTone,
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getFlowWidth(amountCents: number, totalCents: number) {
  if (totalCents <= 0) return 8;
  return clamp((amountCents / totalCents) * 146, 8, 54);
}

function makeDistributedAnchors(nodes: FlowNode[], totalCents: number, top: number, bottom: number) {
  const yValues = distributeY(nodes.length, top, bottom);
  return nodes.map((node, index) => ({
    ...node,
    y: yValues[index],
    width: getFlowWidth(node.amountCents, totalCents),
    share: totalCents > 0 ? node.amountCents / totalCents : 0,
  }));
}

function makeStackedAnchors(nodes: FlowNode[], totalCents: number, centerY: number) {
  const widths = nodes.map((node) => getFlowWidth(node.amountCents, totalCents));
  const gap = 4;
  const height = widths.reduce((total, width) => total + width, 0) + gap * Math.max(0, widths.length - 1);
  let cursor = centerY - height / 2;

  return nodes.map((node, index) => {
    const width = widths[index];
    const y = cursor + width / 2;
    cursor += width + gap;
    return {
      ...node,
      y,
      width,
      share: totalCents > 0 ? node.amountCents / totalCents : 0,
    };
  });
}

function getToneColor(tone: FlowTone | undefined, index = 0) {
  if (tone === 'saved') return '#D4AF37';
  if (tone === 'reserve') return '#1B9C64';
  if (tone === 'expense') return ['#DADADA', '#E4E4E4', '#CFCFCF', '#ECECEC'][index % 4];
  return ['#D4AF37', '#E0BD42', '#C99B1F', '#E8CD72'][index % 4];
}

function getFlowOpacity(tone: FlowTone | undefined) {
  if (tone === 'expense') return 0.68;
  if (tone === 'reserve') return 0.42;
  return 0.72;
}

function getDot(tone: FlowTone | undefined) {
  if (tone === 'saved') return 'bg-[var(--aurum-accent)]';
  if (tone === 'reserve') return 'bg-[var(--aurum-success)]';
  if (tone === 'income') return 'bg-[var(--aurum-accent)]/80';
  return 'bg-[var(--aurum-border)]';
}

function getProgressClass(tone: FlowTone | undefined) {
  if (tone === 'expense') return 'bg-[var(--aurum-border)]';
  if (tone === 'reserve') return 'bg-[var(--aurum-success)]';
  return 'bg-[var(--aurum-accent)]';
}

function formatPercent(value: number) {
  if (value > 0 && value < 0.01) return '<1%';
  return `${Math.round(value * 100)}%`;
}

function truncateLabel(label: string, max = 20) {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 3)}...`;
}

function ribbonPath(
  startX: number,
  startY: number,
  startWidth: number,
  endX: number,
  endY: number,
  endWidth: number,
) {
  const controlA = startX + (endX - startX) * 0.48;
  const controlB = startX + (endX - startX) * 0.58;
  const startTop = startY - startWidth / 2;
  const startBottom = startY + startWidth / 2;
  const endTop = endY - endWidth / 2;
  const endBottom = endY + endWidth / 2;

  return [
    `M ${startX} ${startTop}`,
    `C ${controlA} ${startTop}, ${controlB} ${endTop}, ${endX} ${endTop}`,
    `L ${endX} ${endBottom}`,
    `C ${controlB} ${endBottom}, ${controlA} ${startBottom}, ${startX} ${startBottom}`,
    'Z',
  ].join(' ');
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
                className={`h-full rounded-full ${getProgressClass(node.tone)}`}
                style={{
                  width: `${total > 0 ? Math.max(8, (node.amountCents / total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowLabel({
  anchor,
  align,
  x,
}: {
  anchor: FlowAnchor;
  align: 'left' | 'right';
  x: number;
}) {
  return (
    <g>
      <title>{`${anchor.label}: ${formatMoney(anchor.amountCents)}`}</title>
      <text
        x={x}
        y={anchor.y - 10}
        textAnchor={align === 'right' ? 'end' : 'start'}
        className='fill-[var(--aurum-text)] text-[12px] font-semibold'
      >
        {truncateLabel(anchor.label)}
      </text>
      <text
        x={x}
        y={anchor.y + 9}
        textAnchor={align === 'right' ? 'end' : 'start'}
        className='fill-[var(--aurum-text-muted)] text-[11px]'
      >
        {formatMoney(anchor.amountCents)} / {formatPercent(anchor.share)}
      </text>
    </g>
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
    ? [
        ...sampleExpenseChannels,
        { label: 'Saved / invested', amountCents: sampleNetCents, tone: 'saved' as const },
      ]
    : [...liveExpenses, ...liveSaved];

  const sourceTotal = sum(sources);
  const expenseTotal = usingSample ? sum(sampleExpenseChannels) : expenseCents;
  const displayedNetCents = usingSample ? sampleNetCents : netCents;
  const leftAnchors = makeDistributedAnchors(sources, sourceTotal, 92, 288);
  const leftCenterAnchors = makeStackedAnchors(sources, sourceTotal, chart.centerY);
  const rightAnchors = makeDistributedAnchors(destinations, sourceTotal, 78, 302);
  const rightCenterAnchors = makeStackedAnchors(destinations, sourceTotal, chart.centerY);
  const centerStackHeight = Math.max(
    leftCenterAnchors.reduce((total, anchor) => total + anchor.width, 0) + leftCenterAnchors.length * 4,
    rightCenterAnchors.reduce((total, anchor) => total + anchor.width, 0) + rightCenterAnchors.length * 4,
    98,
  );
  const centerNodeHeight = clamp(centerStackHeight + 22, 106, 178);
  const centerNodeY = chart.centerY - centerNodeHeight / 2;

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
              ? 'Previewing a complete Sankey treatment with sample channels until this month has both income and spending records.'
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
              {formatMoney(expenseTotal)}
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
          <Skeleton className='h-[380px] rounded-[24px]' />
        ) : (
          <>
            <div className='hidden rounded-[24px] border border-[var(--aurum-border)] bg-white p-4 md:block'>
              <svg
                role='img'
                aria-label='Monthly cashflow channel Sankey chart'
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className='h-[380px] w-full overflow-visible'
              >
                <defs>
                  <filter id='aurum-flow-soft-shadow' x='-20%' y='-20%' width='140%' height='140%'>
                    <feDropShadow dx='0' dy='12' stdDeviation='12' floodColor='rgba(17,24,39,0.08)' />
                  </filter>
                  <linearGradient id='aurum-income-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#D4AF37' stopOpacity='0.72' />
                    <stop offset='100%' stopColor='#E7CA68' stopOpacity='0.48' />
                  </linearGradient>
                  <linearGradient id='aurum-saved-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#E7CA68' stopOpacity='0.42' />
                    <stop offset='100%' stopColor='#D4AF37' stopOpacity='0.86' />
                  </linearGradient>
                </defs>

                <text x='42' y='34' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Income Sources
                </text>
                <text x='438' y='34' textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Monthly Cashflow
                </text>
                <text x='724' y='34' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Spending / Retained
                </text>

                {leftAnchors.map((anchor, index) => {
                  const centerAnchor = leftCenterAnchors[index];
                  return (
                    <path
                      key={`income-ribbon-${anchor.label}`}
                      d={ribbonPath(
                        chart.leftNodeX + 13,
                        anchor.y,
                        anchor.width,
                        chart.centerLeftX,
                        centerAnchor.y,
                        centerAnchor.width,
                      )}
                      fill={anchor.tone === 'income' ? 'url(#aurum-income-flow)' : getToneColor(anchor.tone, index)}
                      opacity={getFlowOpacity(anchor.tone)}
                    />
                  );
                })}

                {rightAnchors.map((anchor, index) => {
                  const centerAnchor = rightCenterAnchors[index];
                  return (
                    <path
                      key={`expense-ribbon-${anchor.label}`}
                      d={ribbonPath(
                        chart.centerRightX,
                        centerAnchor.y,
                        centerAnchor.width,
                        chart.rightNodeX,
                        anchor.y,
                        anchor.width,
                      )}
                      fill={anchor.tone === 'saved' ? 'url(#aurum-saved-flow)' : getToneColor(anchor.tone, index)}
                      opacity={getFlowOpacity(anchor.tone)}
                    />
                  );
                })}

                {leftAnchors.map((anchor, index) => {
                  const color = getToneColor(anchor.tone, index);
                  const nodeHeight = clamp(anchor.width + 10, 18, 64);
                  return (
                    <g key={`source-node-${anchor.label}`}>
                      <rect
                        x={chart.leftNodeX}
                        y={anchor.y - nodeHeight / 2}
                        width='13'
                        height={nodeHeight}
                        rx='5'
                        fill={color}
                      />
                      <circle cx={chart.leftNodeX + 6.5} cy={anchor.y} r='2.2' fill='rgba(26,26,26,0.22)' />
                      <FlowLabel anchor={anchor} align='right' x={chart.leftNodeX - 22} />
                    </g>
                  );
                })}

                {rightAnchors.map((anchor, index) => {
                  const color = getToneColor(anchor.tone, index);
                  const nodeHeight = clamp(anchor.width + 10, 18, 64);
                  return (
                    <g key={`destination-node-${anchor.label}`}>
                      <rect
                        x={chart.rightNodeX}
                        y={anchor.y - nodeHeight / 2}
                        width='13'
                        height={nodeHeight}
                        rx='5'
                        fill={color}
                      />
                      <circle cx={chart.rightNodeX + 6.5} cy={anchor.y} r='2.2' fill='rgba(26,26,26,0.18)' />
                      <FlowLabel anchor={anchor} align='left' x={chart.rightLabelX} />
                    </g>
                  );
                })}

                <g filter='url(#aurum-flow-soft-shadow)'>
                  <rect
                    x={chart.centerLeftX}
                    y={centerNodeY}
                    width={chart.centerRightX - chart.centerLeftX}
                    height={centerNodeHeight}
                    rx='22'
                    fill='#ffffff'
                    stroke='#e8e8e8'
                  />
                  <rect
                    x={chart.centerLeftX}
                    y={centerNodeY}
                    width='14'
                    height={centerNodeHeight}
                    rx='7'
                    fill='#1f1f1d'
                  />
                  <rect
                    x={chart.centerRightX - 14}
                    y={centerNodeY}
                    width='14'
                    height={centerNodeHeight}
                    rx='7'
                    fill='#D4AF37'
                  />
                </g>

                <text x='475' y={chart.centerY - 17} textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Monthly Flow
                </text>
                <text x='475' y={chart.centerY + 10} textAnchor='middle' className='fill-[var(--aurum-text)] text-[20px] font-semibold'>
                  {formatMoney(sourceTotal)}
                </text>
                <text x='475' y={chart.centerY + 31} textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[11px]'>
                  {sources.length} in / {destinations.length} out
                </text>
              </svg>
            </div>

            <div className='grid grid-cols-1 gap-4 md:hidden'>
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
