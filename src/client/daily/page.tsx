import { useCallback, useEffect, useRef, useState } from 'react';
import { localDate, shiftDate } from '../../core/calendar.ts';
import { meals } from '../../core/choices.ts';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { ErrorNotice, Loading } from '../feedback.tsx';
import { useResource, useUnsavedWarning } from '../requests.ts';
import { DietForm } from './form.tsx';
import { MealCard } from './meal-card.tsx';
import { Summary } from './summary.tsx';

type Draft = { key: number; meal: Meal; entry?: DietItem; dirty: boolean };

export function DailyPage({ openFoodEditor, revision, active }: { openFoodEditor: OpenFoodEditor; revision: number; active: boolean }) {
  const [date, setDate] = useState(() => localDate());
  const [followingToday, setFollowingToday] = useState(true);
  const [draft, setDraft] = useState<Draft>();
  const [savedDate, setSavedDate] = useState<string>();
  useUnsavedWarning(Boolean(draft?.dirty));
  const nextKey = useRef(0);
  const load = useCallback((signal: AbortSignal) => request('daily_summary', { date }, signal), [date, revision]);
  const resource = useResource(load, 4000, active);
  useEffect(() => { if (resource.data) setSavedDate(undefined); }, [resource.data]);

  useEffect(() => {
    if (!active || !followingToday || draft) return;
    const refreshDate = () => setDate(localDate());
    refreshDate();
    window.addEventListener('focus', refreshDate);
    const timer = window.setInterval(refreshDate, 30000);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshDate); };
  }, [active, followingToday, draft]);

  function discardDraft() { return !draft?.dirty || window.confirm('这条饮食记录还没有保存。要放弃编辑吗？'); }

  function startDraft(meal: Meal, entry?: DietItem) {
    if (!discardDraft()) return;
    setDraft({ key: ++nextKey.current, meal, entry, dirty: false });
  }

  function changeDate(next: string) {
    if (!next || date === next || !discardDraft()) return;
    setDraft(undefined);
    setSavedDate(undefined);
    setFollowingToday(next === localDate());
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
    {resource.error && <ErrorNotice text={
      `${savedDate === date ? '饮食记录已保存。' : ''}${resource.data ? '更新失败，当前显示上次读取的记录。' : ''}${resource.error}`
    } retry={resource.refresh} />}
    {!resource.error && !resource.data && <Loading />}
    <div className="cal-meals" aria-busy={!resource.data && !resource.error}>
      {meals.map((meal) => <MealCard
        key={`${date}/${meal}`} meal={meal} items={resource.data?.items.filter((entry) => entry.meal === meal)}
        onAdd={() => startDraft(meal)} onEdit={(entry) => startDraft(meal, entry)}
        openFoodEditor={openFoodEditor} onRemoved={resource.refresh}
      >
        {draft?.meal === meal && <DietForm
          key={draft.key} date={date} meal={meal} entry={draft.entry} revision={revision}
          openFoodEditor={openFoodEditor} onCancel={() => { if (discardDraft()) setDraft(undefined); }}
          onDirty={() => setDraft((current) => current?.key === draft.key && !current.dirty ? { ...current, dirty: true } : current)}
          onSaved={() => { setSavedDate(date); setDraft((current) => current?.key === draft.key ? undefined : current); resource.refresh(); }}
        />}
      </MealCard>)}
    </div>
  </div>;
}
