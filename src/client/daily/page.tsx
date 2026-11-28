import { useCallback, useEffect, useRef, useState } from 'react';
import { meals } from '../../core/choices.ts';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { confirmDiscard } from '../dirty.ts';
import { energyByMeal } from '../energy.ts';
import { useMutation } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { entryOf } from './data.ts';
import { DateNav } from './date-nav.tsx';
import { DietForm } from './diet-form.tsx';
import type { OpenFood } from './diet-form.tsx';
import { MealSection } from './meal-section.tsx';
import { Summary } from './summary.tsx';
import { useDailySummary, useFollowedDate } from './use-day.ts';

type Props = {
  initialDate?: string;
  revision: number;
  onOpenFood: OpenFood;
  onOpenProfile: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

/** 正在编辑的草稿：添加某一餐，或修改某条记录。 */
type Draft = { key: number; meal: Meal; item?: DietItem };

export function DailyPage({ initialDate, revision, onOpenFood, onOpenProfile, onDirtyChange }: Props) {
  const [draft, setDraft] = useState<Draft>();
  const draftDirty = useRef(false);
  const nextKey = useRef(0);
  const [date, setDate] = useFollowedDate(draft === undefined, initialDate);
  const { summary, fresh, error, refresh } = useDailySummary(date, revision);
  const [justSaved, setJustSaved] = useState(false);
  const remove = useMutation();

  useEffect(() => { setJustSaved(false); }, [fresh]);

  const reportDirty = useCallback((dirty: boolean) => {
    draftDirty.current = dirty;
    onDirtyChange(dirty);
  }, [onDirtyChange]);

  const leaveDraft = () => confirmDiscard(draft !== undefined && draftDirty.current);

  const changeDate = (next: string) => {
    if (next === date || !leaveDraft()) return;
    setDraft(undefined);
    setDate(next);
  };

  const startDraft = (meal: Meal, item?: DietItem) => {
    if (draft && !draft.item && !item && draft.meal === meal) return;
    if (!leaveDraft()) return;
    nextKey.current += 1;
    remove.clearError();
    setDraft({ key: nextKey.current, meal, item });
  };

  const cancelDraft = () => { if (leaveDraft()) setDraft(undefined); };

  const draftSaved = (key: number) => {
    setDraft((current) => current?.key === key ? undefined : current);
    setJustSaved(true);
    refresh();
  };

  const deleteItem = (item: DietItem) => {
    if (!window.confirm(`删除这条「${item.foodName}」记录？`)) return;
    void remove.run('diet_delete', { id: item.id, expected: entryOf(item) }, () => refresh());
  };

  const openItemFood = (item: DietItem) => onOpenFood({ id: item.foodId });

  const items = summary?.items ?? [];
  const byMeal = energyByMeal(items);
  const editingShown = draft?.item ? items.some(({ id }) => id === draft.item!.id) : false;
  const form = draft && <DietForm
    key={draft.key} date={date} meal={draft.meal} item={draft.item} revision={revision}
    onOpenFood={onOpenFood} onCancel={cancelDraft} onSaved={() => draftSaved(draft.key)} reportDirty={reportDirty}
  />;

  return <div className="cal-daily">
    <DateNav date={date} onChange={changeDate} />

    {error && <Banner onRetry={refresh}>{justSaved ? `饮食记录已保存。${error}` : error}</Banner>}
    {remove.error && <Banner onDismiss={remove.clearError}>{remove.error}</Banner>}

    <div className="cal-daily-grid">
      <Summary summary={summary} onOpenProfile={onOpenProfile} />
      <div className="cal-meals" aria-busy={summary === undefined}>
        {meals.map((meal) => {
          const adding = draft && (draft.item ? !editingShown && draft.item.meal === meal : draft.meal === meal);
          return <MealSection
            key={meal} meal={meal} kcal={byMeal[meal]} loading={summary === undefined}
            items={items.filter((item) => item.meal === meal)}
            addForm={adding ? form : undefined}
            editing={draft?.item && editingShown ? { id: draft.item.id, form } : undefined}
            deleting={remove.busy}
            onAdd={(target) => startDraft(target)}
            onEdit={(item) => startDraft(item.meal, item)}
            onDelete={deleteItem}
            onOpenFood={openItemFood}
          />;
        })}
      </div>
    </div>
  </div>;
}
