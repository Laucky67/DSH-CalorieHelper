import type { DailySummary } from '../../core/contracts.ts';
import { energyText } from '../presentation.ts';

export function Summary({ value }: { value?: DailySummary }) {
  const metrics = [
    { label: '摄入热量', value: value?.totalKcal },
    { label: '估算维持热量', value: value?.maintenanceKcal },
    { label: '热量差值', value: value?.differenceKcal },
  ];

  return <dl className="cal-metrics" aria-label="当天热量">
    {metrics.map((metric) => <div className="cal-metric" key={metric.label}>
      <dt>{metric.label}</dt>
      <dd>{metric.value == null ? '—' : <>{energyText(metric.value)}<span>千卡</span></>}</dd>
    </div>)}
  </dl>;
}
