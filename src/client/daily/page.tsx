import { useCallback, useState } from 'react';
import { localDate, shiftDate } from '../../core/calendar.ts';
import { meals } from '../../core/choices.ts';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { ErrorNotice, Loading } from '../feedback.tsx';
import { useResource } from '../requests.ts';
import { DietForm } from './form.tsx';
import { MealCard } from './meal-card.tsx';
import { Summary } from './summary.tsx';

export function DailyPage({ openFoodEditor, revision }: { openFoodEditor: OpenFoodEditor; revision: number }) {
  const [date, setDate] = useState(() => localDate());
  const [draft, setDraft] = useState<{ meal: Meal; entry?: DietItem }>();
  const load = useCallback((signal: AbortSignal) => request('daily_summary', { date }, signal), [date, revision]);
  const resource = useResource(load);

  function changeDate(next: string) {
    if (!next) return;
    setDraft(undefined);
    setDate(next);
  }

  return <div className="cal-daily">
    <div className="cal-day-bar">
      <h2>每日饮食</h2>
      <div className="cal-date-controls">
        <button type="button" className="cal-icon-button" aria-label="前一天" onClick={() => changeDate(shiftDate(date, -1))}>‹</button>
        <input type="date" aria-label="饮食日期" value={date} onChange={(event) => changeDate(event.target.value)} />
        <button type="button" className="cal-icon-button" aria-label="后一天" onClick={() => changeDate(shiftDate(date, 1))}>›</button>
        <button type="button" className="cal-button cal-small" onClick={() => changeDate(localDate())} disabled={date === localDate()}>今天</button>
      </div>
    </div>
    <Summary value={resource.data} />
    {resource.error && <ErrorNotice text={resource.error} retry={resource.refresh} />}
    {!resource.error && !resource.data && <Loading />}
    <div className="cal-meals" aria-busy={!resource.data && !resource.error}>
      {meals.map((meal) => <MealCard
        key={`${date}/${meal}`} meal={meal} items={resource.data?.items.filter((entry) => entry.meal === meal) ?? []}
        onAdd={() => setDraft({ meal })} onEdit={(entry) => setDraft({ meal, entry })}
        openFoodEditor={openFoodEditor} onRemoved={resource.refresh}
      >
        {draft?.meal === meal && <DietForm
          key={draft.entry?.id ?? 'new'} date={date} meal={meal} entry={draft.entry} revision={revision}
          openFoodEditor={openFoodEditor} onCancel={() => setDraft(undefined)}
          onSaved={() => { setDraft(undefined); resource.refresh(); }}
        />}
      </MealCard>)}
    </div>
  </div>;
}
