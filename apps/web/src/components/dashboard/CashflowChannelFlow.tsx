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

type VerticalFlowAnchor = FlowNode & {
  x: number;
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
  centerNodeX: 444,
  nodeWidth: 14,
  rightNodeX: 692,
  rightLabelX: 724,
  centerY: 190,
};

const mobileChart = {
  width: 360,
  height: 620,
  topNodeY: 116,
  centerY: 312,
  bottomNodeY: 464,
  nodeHeight: 10,
  centerNodeHeight: 12,
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
  return clamp((amountCents / totalCents) * 154, 7, 116);
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

function makeDistributedXAnchors(nodes: FlowNode[], totalCents: number, left: number, right: number) {
  const xValues = distributeY(nodes.length, left, right);
  return nodes.map((node, index) => ({
    ...node,
    x: xValues[index],
    width: getFlowWidth(node.amountCents, totalCents),
    share: totalCents > 0 ? node.amountCents / totalCents : 0,
  }));
}

function makeStackedXAnchors(nodes: FlowNode[], totalCents: number, centerX: number) {
  const widths = nodes.map((node) => getFlowWidth(node.amountCents, totalCents));
  const gap = 4;
  const width = widths.reduce((total, item) => total + item, 0) + gap * Math.max(0, widths.length - 1);
  let cursor = centerX - width / 2;

  return nodes.map((node, index) => {
    const flowWidth = widths[index];
    const x = cursor + flowWidth / 2;
    cursor += flowWidth + gap;
    return {
      ...node,
      x,
      width: flowWidth,
      share: totalCents > 0 ? node.amountCents / totalCents : 0,
    };
  });
}

function getYBounds(anchors: FlowAnchor[]) {
  if (anchors.length === 0) return { top: 0, bottom: 0 };
  return anchors.reduce(
    (bounds, anchor) => ({
      top: Math.min(bounds.top, anchor.y - anchor.width / 2),
      bottom: Math.max(bounds.bottom, anchor.y + anchor.width / 2),
    }),
    { top: Number.POSITIVE_INFINITY, bottom: Number.NEGATIVE_INFINITY },
  );
}

function getXBounds(anchors: VerticalFlowAnchor[]) {
  if (anchors.length === 0) return { left: 0, right: 0 };
  return anchors.reduce(
    (bounds, anchor) => ({
      left: Math.min(bounds.left, anchor.x - anchor.width / 2),
      right: Math.max(bounds.right, anchor.x + anchor.width / 2),
    }),
    { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY },
  );
}

function getToneColor(tone: FlowTone | undefined, index = 0) {
  if (tone === 'saved') return '#2F9E68';
  if (tone === 'reserve') return '#D96868';
  if (tone === 'expense') return ['#D96868', '#E68C85', '#C95A56', '#F0B0AA'][index % 4];
  return ['#D4AF37', '#E0BD42', '#C99B1F', '#E8CD72'][index % 4];
}

function getFlowFill(tone: FlowTone | undefined) {
  if (tone === 'expense') return 'url(#aurum-expense-flow)';
  if (tone === 'saved') return 'url(#aurum-saved-flow)';
  if (tone === 'reserve') return 'url(#aurum-reserve-flow)';
  return 'url(#aurum-income-flow)';
}

function getFlowOpacity(tone: FlowTone | undefined) {
  if (tone === 'expense') return 0.58;
  if (tone === 'reserve') return 0.5;
  if (tone === 'saved') return 0.62;
  return 0.72;
}

function formatPercent(value: number) {
  if (value > 0 && value < 0.01) return '<1%';
  return `${Math.round(value * 100)}%`;
}

function formatCompactMoney(cents: number) {
  const amount = Math.abs(cents) / 100;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `$${Math.round(amount / 1_000)}K`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return formatMoney(cents);
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

function verticalRibbonPath(
  startX: number,
  startY: number,
  startWidth: number,
  endX: number,
  endY: number,
  endWidth: number,
) {
  const controlA = startY + (endY - startY) * 0.42;
  const controlB = startY + (endY - startY) * 0.62;
  const startLeft = startX - startWidth / 2;
  const startRight = startX + startWidth / 2;
  const endLeft = endX - endWidth / 2;
  const endRight = endX + endWidth / 2;

  return [
    `M ${startLeft} ${startY}`,
    `C ${startLeft} ${controlA}, ${endLeft} ${controlB}, ${endLeft} ${endY}`,
    `L ${endRight} ${endY}`,
    `C ${endRight} ${controlB}, ${startRight} ${controlA}, ${startRight} ${startY}`,
    'Z',
  ].join(' ');
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

function MobileFlowLabel({
  anchor,
  y,
  secondaryY,
}: {
  anchor: VerticalFlowAnchor;
  y: number;
  secondaryY: number;
}) {
  return (
    <g>
      <title>{`${anchor.label}: ${formatMoney(anchor.amountCents)}`}</title>
      <text
        x={anchor.x}
        y={y}
        textAnchor='middle'
        className='fill-[var(--aurum-text)] text-[10px] font-semibold'
      >
        {truncateLabel(anchor.label, 12)}
      </text>
      <text
        x={anchor.x}
        y={secondaryY}
        textAnchor='middle'
        className='fill-[var(--aurum-text-muted)] text-[9px]'
      >
        {formatCompactMoney(anchor.amountCents)} / {formatPercent(anchor.share)}
      </text>
    </g>
  );
}

function MobileSankeyChart({
  sources,
  destinations,
  sourceTotal,
}: {
  sources: FlowNode[];
  destinations: FlowNode[];
  sourceTotal: number;
}) {
  const mobileSources = compactNodes(sources, 3, 'Other income');
  const mobileDestinations = compactNodes(destinations, 4, 'Other flow');
  const topAnchors = makeDistributedXAnchors(mobileSources, sourceTotal, 58, 302);
  const topCenterAnchors = makeStackedXAnchors(mobileSources, sourceTotal, mobileChart.width / 2);
  const bottomAnchors = makeDistributedXAnchors(mobileDestinations, sourceTotal, 48, 312);
  const bottomCenterAnchors = makeStackedXAnchors(
    mobileDestinations,
    sourceTotal,
    mobileChart.width / 2,
  );
  const topCenterBounds = getXBounds(topCenterAnchors);
  const bottomCenterBounds = getXBounds(bottomCenterAnchors);
  const centerLeft = Math.min(topCenterBounds.left, bottomCenterBounds.left);
  const centerRight = Math.max(topCenterBounds.right, bottomCenterBounds.right);
  const centerWidth = Math.max(96, centerRight - centerLeft);
  const centerX = mobileChart.width / 2 - centerWidth / 2;

  return (
    <div className='rounded-[24px] border border-[var(--aurum-border)] bg-white px-2 py-4 md:hidden'>
      <svg
        role='img'
        aria-label='Vertical monthly cashflow channel Sankey chart'
        viewBox={`0 0 ${mobileChart.width} ${mobileChart.height}`}
        className='h-[620px] w-full overflow-visible'
      >
        <defs>
          <linearGradient id='aurum-mobile-income-flow' x1='0%' x2='0%' y1='0%' y2='100%'>
            <stop offset='0%' stopColor='#D4AF37' stopOpacity='0.82' />
            <stop offset='100%' stopColor='#EAD17A' stopOpacity='0.62' />
          </linearGradient>
          <linearGradient id='aurum-mobile-expense-flow' x1='0%' x2='0%' y1='0%' y2='100%'>
            <stop offset='0%' stopColor='#EFC0BA' stopOpacity='0.62' />
            <stop offset='100%' stopColor='#D96868' stopOpacity='0.78' />
          </linearGradient>
          <linearGradient id='aurum-mobile-saved-flow' x1='0%' x2='0%' y1='0%' y2='100%'>
            <stop offset='0%' stopColor='#A8DDBD' stopOpacity='0.5' />
            <stop offset='100%' stopColor='#2F9E68' stopOpacity='0.82' />
          </linearGradient>
          <linearGradient id='aurum-mobile-reserve-flow' x1='0%' x2='0%' y1='0%' y2='100%'>
            <stop offset='0%' stopColor='#D96868' stopOpacity='0.72' />
            <stop offset='100%' stopColor='#EFC0BA' stopOpacity='0.48' />
          </linearGradient>
        </defs>

        <text x='180' y='30' textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
          Income Sources
        </text>
        <text x='180' y='236' textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
          Monthly Flow
        </text>
        <text x='180' y='430' textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
          Spending / Retained
        </text>

        {topAnchors.map((anchor, index) => {
          const centerAnchor = topCenterAnchors[index];
          return (
            <path
              key={`mobile-income-ribbon-${anchor.label}`}
              d={verticalRibbonPath(
                anchor.x,
                mobileChart.topNodeY + mobileChart.nodeHeight - 0.3,
                anchor.width,
                centerAnchor.x,
                mobileChart.centerY - mobileChart.centerNodeHeight / 2 + 0.3,
                centerAnchor.width,
              )}
              fill={
                anchor.tone === 'reserve'
                  ? 'url(#aurum-mobile-reserve-flow)'
                  : 'url(#aurum-mobile-income-flow)'
              }
              opacity={getFlowOpacity(anchor.tone)}
            />
          );
        })}

        {bottomAnchors.map((anchor, index) => {
          const centerAnchor = bottomCenterAnchors[index];
          return (
            <path
              key={`mobile-expense-ribbon-${anchor.label}`}
              d={verticalRibbonPath(
                centerAnchor.x,
                mobileChart.centerY + mobileChart.centerNodeHeight / 2 - 0.3,
                centerAnchor.width,
                anchor.x,
                mobileChart.bottomNodeY + 0.3,
                anchor.width,
              )}
              fill={
                anchor.tone === 'saved'
                  ? 'url(#aurum-mobile-saved-flow)'
                  : anchor.tone === 'reserve'
                    ? 'url(#aurum-mobile-reserve-flow)'
                    : 'url(#aurum-mobile-expense-flow)'
              }
              opacity={getFlowOpacity(anchor.tone)}
            />
          );
        })}

        {topAnchors.map((anchor, index) => (
          <g key={`mobile-source-node-${anchor.label}`}>
            <rect
              x={anchor.x - anchor.width / 2}
              y={mobileChart.topNodeY}
              width={anchor.width}
              height={mobileChart.nodeHeight}
              rx='0'
              fill={getToneColor(anchor.tone, index)}
            />
            <MobileFlowLabel anchor={anchor} y={mobileChart.topNodeY - 24} secondaryY={mobileChart.topNodeY - 9} />
          </g>
        ))}

        {bottomAnchors.map((anchor, index) => (
          <g key={`mobile-destination-node-${anchor.label}`}>
            <rect
              x={anchor.x - anchor.width / 2}
              y={mobileChart.bottomNodeY}
              width={anchor.width}
              height={mobileChart.nodeHeight}
              rx='0'
              fill={getToneColor(anchor.tone, index)}
            />
            <MobileFlowLabel anchor={anchor} y={mobileChart.bottomNodeY + 34} secondaryY={mobileChart.bottomNodeY + 49} />
          </g>
        ))}

        <rect
          x={centerX}
          y={mobileChart.centerY - mobileChart.centerNodeHeight / 2}
          width={centerWidth}
          height={mobileChart.centerNodeHeight}
          rx='0'
          fill='#D4AF37'
        />
        <text x='180' y='270' textAnchor='middle' className='fill-[var(--aurum-text)] text-[22px] font-semibold'>
          {formatMoney(sourceTotal)}
        </text>
      </svg>
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
  const leftCenterBounds = getYBounds(leftCenterAnchors);
  const rightCenterBounds = getYBounds(rightCenterAnchors);
  const centerNodeY = Math.min(leftCenterBounds.top, rightCenterBounds.top);
  const centerNodeBottom = Math.max(leftCenterBounds.bottom, rightCenterBounds.bottom);
  const centerNodeHeight = centerNodeBottom - centerNodeY;
  const centerNodeRightX = chart.centerNodeX + chart.nodeWidth;

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
          <div className='rounded-[18px] border border-[rgba(212,175,55,0.34)] bg-white px-3 py-3'>
            <p className='inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              <span className='h-1.5 w-1.5 rounded-full bg-[var(--aurum-accent)]' />
              Inflow
            </p>
            <p className='mt-1 text-base font-semibold text-[var(--aurum-text)]'>
              {formatMoney(sourceTotal)}
            </p>
          </div>
          <div className='rounded-[18px] border border-[rgba(210,75,75,0.28)] bg-white px-3 py-3'>
            <p className='inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              <span className='h-1.5 w-1.5 rounded-full bg-[var(--aurum-danger)]' />
              Outflow
            </p>
            <p className='mt-1 text-base font-semibold text-[var(--aurum-text)]'>
              {formatMoney(expenseTotal)}
            </p>
          </div>
          <div
            className={`rounded-[18px] border bg-white px-3 py-3 ${
              displayedNetCents >= 0
                ? 'border-[rgba(27,156,100,0.3)]'
                : 'border-[rgba(210,75,75,0.28)]'
            }`}
          >
            <p className='inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  displayedNetCents >= 0 ? 'bg-[var(--aurum-success)]' : 'bg-[var(--aurum-danger)]'
                }`}
              />
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
                  <linearGradient id='aurum-income-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#D4AF37' stopOpacity='0.84' />
                    <stop offset='100%' stopColor='#EAD17A' stopOpacity='0.66' />
                  </linearGradient>
                  <linearGradient id='aurum-expense-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#EFC0BA' stopOpacity='0.64' />
                    <stop offset='100%' stopColor='#D96868' stopOpacity='0.82' />
                  </linearGradient>
                  <linearGradient id='aurum-saved-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#A8DDBD' stopOpacity='0.56' />
                    <stop offset='100%' stopColor='#2F9E68' stopOpacity='0.86' />
                  </linearGradient>
                  <linearGradient id='aurum-reserve-flow' x1='0%' x2='100%' y1='0%' y2='0%'>
                    <stop offset='0%' stopColor='#D96868' stopOpacity='0.72' />
                    <stop offset='100%' stopColor='#EFC0BA' stopOpacity='0.5' />
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
                        chart.leftNodeX + chart.nodeWidth - 0.3,
                        anchor.y,
                        anchor.width,
                        chart.centerNodeX + 0.3,
                        centerAnchor.y,
                        centerAnchor.width,
                      )}
                      fill={getFlowFill(anchor.tone)}
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
                        centerNodeRightX - 0.3,
                        centerAnchor.y,
                        centerAnchor.width,
                        chart.rightNodeX + 0.3,
                        anchor.y,
                        anchor.width,
                      )}
                      fill={getFlowFill(anchor.tone)}
                      opacity={getFlowOpacity(anchor.tone)}
                    />
                  );
                })}

                {leftAnchors.map((anchor, index) => {
                  const color = getToneColor(anchor.tone, index);
                  const nodeHeight = anchor.width;
                  return (
                    <g key={`source-node-${anchor.label}`}>
                      <rect
                        x={chart.leftNodeX}
                        y={anchor.y - nodeHeight / 2}
                        width={chart.nodeWidth}
                        height={nodeHeight}
                        rx='0'
                        fill={color}
                      />
                      <FlowLabel anchor={anchor} align='right' x={chart.leftNodeX - 22} />
                    </g>
                  );
                })}

                {rightAnchors.map((anchor, index) => {
                  const color = getToneColor(anchor.tone, index);
                  const nodeHeight = anchor.width;
                  return (
                    <g key={`destination-node-${anchor.label}`}>
                      <rect
                        x={chart.rightNodeX}
                        y={anchor.y - nodeHeight / 2}
                        width={chart.nodeWidth}
                        height={nodeHeight}
                        rx='0'
                        fill={color}
                      />
                      <FlowLabel anchor={anchor} align='left' x={chart.rightLabelX} />
                    </g>
                  );
                })}

                <rect
                  x={chart.centerNodeX}
                  y={centerNodeY}
                  width={chart.nodeWidth}
                  height={centerNodeHeight}
                  rx='0'
                  fill='#D4AF37'
                />

                <text x='451' y={centerNodeY - 46} textAnchor='middle' className='fill-[var(--aurum-text-muted)] text-[10px] font-semibold uppercase tracking-[0.18em]'>
                  Monthly Flow
                </text>
                <text x='451' y={centerNodeY - 20} textAnchor='middle' className='fill-[var(--aurum-text)] text-[20px] font-semibold'>
                  {formatMoney(sourceTotal)}
                </text>
              </svg>
            </div>

            <MobileSankeyChart
              sources={sources}
              destinations={destinations}
              sourceTotal={sourceTotal}
            />

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
