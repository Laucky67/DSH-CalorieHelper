import { trendRanges } from '../../core/contracts.ts';
import type { TrendRange } from '../../core/contracts.ts';

const labels: Record<TrendRange, string> = { '7': '7 天', '30': '30 天', '90': '90 天', all: '全部' };

export function RangePicker({ value, onChange }: { value: TrendRange; onChange: (range: TrendRange) => void }) {
  return <div className="cal-trend-ranges" role="group" aria-label="统计日期范围">
    {trendRanges.map((range) => <button type="button" key={range}
      aria-pressed={range === value} onClick={() => onChange(range)}
    >{labels[range]}</button>)}
  </div>;
}
