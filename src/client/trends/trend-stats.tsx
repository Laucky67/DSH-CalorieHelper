import { trendNutrients } from '../../core/contracts.ts';
import type { Trends } from '../../core/contracts.ts';
import { gramText } from '../format.ts';
import { FlameIcon } from '../icons.tsx';

const labels = { proteinG: '蛋白质', fatG: '脂肪', carbsG: '碳水' };

export function TrendStats({ data }: { data: Trends }) {
  return <aside className="cal-trend-stats">
    <section className="cal-card cal-trend-streak" aria-label="连续记录">
      <span className="cal-streak-icon"><FlameIcon size={24} /></span>
      <div><span className="cal-muted">当前连续</span><p><strong>{data.streak.current}</strong> 天</p></div>
      <div><span className="cal-muted">最长连续</span><p><strong>{data.streak.longest}</strong> 天</p></div>
    </section>
    <section className="cal-card cal-trend-averages">
      <h2>每日平均</h2>
      <dl>
        {trendNutrients.map((key) => {
          const average = data.averages[key];
          return <div className="cal-trend-nutrient" key={key}>
            <dt><i data-nutrient={key} />{labels[key]}</dt>
            <dd>{average.grams === null ? <span className="cal-muted">资料不足</span> : <>
              <strong>{gramText(average.grams)}</strong><span className="cal-muted"> g</span>
            </>}</dd>
          </div>;
        })}
      </dl>
    </section>
  </aside>;
}
