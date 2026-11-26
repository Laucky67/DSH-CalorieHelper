import { meals } from '../../core/choices.ts';
import type { DailySummary } from '../../core/contracts.ts';
import { energyByMeal } from '../energy.ts';
import { mealLabels } from '../presentation.ts';
import { Kcal } from '../ui.tsx';
import { IntakeRing } from './intake-ring.tsx';

type Props = { summary: DailySummary | undefined; onOpenProfile: () => void };

function differenceNote(value: number): string {
  if (value > 0) return '低于估算';
  if (value < 0) return '超出估算';
  return '持平';
}

export function Summary({ summary, onOpenProfile }: Props) {
  const byMeal = summary ? energyByMeal(summary.items) : undefined;
  const maintenance = summary?.maintenanceKcal;
  const difference = summary?.differenceKcal;
  const tone = difference == null ? '' : difference < 0 ? ' is-over' : ' is-under';

  return <section className="cal-summary cal-card" aria-label="当日热量">
    <IntakeRing byMeal={byMeal} total={summary?.totalKcal} maintenance={maintenance} />
    <div className="cal-summary-side">
      <dl className="cal-stats">
        <div className="cal-stat">
          <dt>估算维持热量</dt>
          <dd>
            {summary === undefined ? <span className="cal-faint">—</span>
              : maintenance != null ? <Kcal value={maintenance} />
                : <button type="button" className="cal-link" onClick={onOpenProfile}>完善个人资料</button>}
          </dd>
        </div>
        <div className={`cal-stat${tone}`}>
          <dt>热量差值</dt>
          <dd>
            {difference == null ? <span className="cal-faint">—</span> : <>
              <Kcal value={difference} />
              <span className="cal-diff-note">{differenceNote(difference)}</span>
            </>}
          </dd>
        </div>
      </dl>
      <ul className="cal-legend" aria-label="图例">
        {meals.map((meal) => <li key={meal}><i data-meal-color={meal} />{mealLabels[meal]}</li>)}
      </ul>
    </div>
  </section>;
}
