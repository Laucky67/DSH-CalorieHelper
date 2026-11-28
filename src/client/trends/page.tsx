import { useCallback, useState } from 'react';
import type { TrendRange } from '../../core/contracts.ts';
import { request } from '../api.ts';
import { useResource } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { TrendChart } from './trend-chart.tsx';
import { TrendStats } from './trend-stats.tsx';
import { RangePicker } from './range-picker.tsx';

export function TrendsPage({ onOpenDate }: { onOpenDate: (date: string) => void }) {
  const [range, setRange] = useState<TrendRange>('7');
  const load = useCallback((signal: AbortSignal) => request('trends', {
    range, timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
  }, signal), [range]);
  const { data, error, refresh } = useResource(load, 4000);

  return <div className="cal-trends">
    <div className="cal-trend-toolbar"><RangePicker value={range} onChange={setRange} /></div>
    {error && <Banner onRetry={refresh}>{error}</Banner>}
    {data ? <div className="cal-trends-grid">
      <TrendChart key={range} days={data.days} onOpenDate={onOpenDate} />
      <TrendStats data={data} />
    </div> : !error && <p className="cal-muted" role="status">正在读取趋势…</p>}
  </div>;
}
