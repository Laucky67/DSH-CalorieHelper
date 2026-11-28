import { useCallback, useState } from 'react';
import { trendRanges } from '../../core/contracts.ts';
import type { TrendRange } from '../../core/contracts.ts';
import { request } from '../api.ts';
import { useResource } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { TrendChart } from './trend-chart.tsx';
import { TrendStats } from './trend-stats.tsx';

const rangeLabels: Record<TrendRange, string> = { '7': '7 天', '30': '30 天', '90': '90 天', all: '全部' };

export function TrendsPage({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const [range, setRange] = useState<TrendRange>('7');
  const load = useCallback((signal: AbortSignal) => request('trends', {
    range, timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
  }, signal), [range]);
  const { data, error, refresh } = useResource(load, 4000);

  return <div className="cal-trends">
    <div className="cal-trends-heading">
      <h1>趋势</h1>
      <div className="cal-trend-ranges" role="group" aria-label="统计日期范围">
        {trendRanges.map((value) => <button type="button" key={value}
          aria-pressed={range === value} onClick={() => setRange(value)}
        >{rangeLabels[value]}</button>)}
      </div>
    </div>
    {error && <Banner onRetry={refresh}>{error}</Banner>}
    {data ? <div className="cal-trends-grid">
      <TrendChart key={range} days={data.days} recordedDays={data.recordedDays} onOpenDate={onOpenDate} />
      <TrendStats data={data} />
    </div> : !error && <p className="cal-muted" role="status">正在读取趋势…</p>}
  </div>;
}
