import type { ReactNode } from 'react';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { PlusIcon } from '../icons.tsx';
import { mealLabels } from '../presentation.ts';
import { Kcal } from '../ui.tsx';
import { ItemRow } from './item-row.tsx';

type Props = {
  meal: Meal;
  items: DietItem[];
  kcal: number;
  loading: boolean;
  /** 正在这一餐添加记录时的表单。 */
  addForm?: ReactNode;
  /** 正在修改的记录 id 及其表单。 */
  editing?: { id: string; form: ReactNode };
  deleting: boolean;
  onAdd: (meal: Meal) => void;
  onEdit: (item: DietItem) => void;
  onDelete: (item: DietItem) => void;
  onOpenFood: (item: DietItem) => void;
};

export function MealSection({ meal, items, kcal, loading, addForm, editing, deleting, onAdd, onEdit, onDelete, onOpenFood }: Props) {
  const label = mealLabels[meal];
  const empty = items.length === 0 && !addForm;
  return <section className={`cal-meal${empty ? ' is-empty' : ''}`} data-meal={meal} aria-label={label}>
    <header className="cal-meal-head">
      <i className="cal-meal-dot" data-meal-color={meal} aria-hidden="true" />
      <h3>{label}</h3>
      <span className="cal-meal-total">
        {items.length > 0 ? <Kcal value={kcal} /> : <span className="cal-faint">{loading ? '' : '—'}</span>}
      </span>
      <button type="button" className="cal-add-btn" aria-label={`添加${label}记录`} title={`添加${label}记录`} onClick={() => onAdd(meal)} aria-expanded={Boolean(addForm)}>
        <PlusIcon size={16} />
      </button>
    </header>
    {items.length > 0 && <ul className="cal-items">
      {items.map((item) => editing?.id === item.id
        ? <li key={item.id} className="cal-item is-editing">{editing.form}</li>
        : <ItemRow key={item.id} item={item} busy={deleting} onEdit={onEdit} onDelete={onDelete} onOpenFood={onOpenFood} />)}
    </ul>}
    {addForm && <div className="cal-meal-add">{addForm}</div>}
  </section>;
}
