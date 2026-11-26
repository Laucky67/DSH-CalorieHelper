import { useCallback, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { meals } from '../../core/choices.ts';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { EditButton, ErrorNotice } from '../feedback.tsx';
import { fieldText, mealLabels } from '../presentation.ts';
import { useMutation, useResource } from '../requests.ts';

export function DietForm({ date, meal, entry, revision, openFoodEditor, onSaved, onCancel }: {
  date: string;
  meal: Meal;
  entry?: DietItem;
  revision: number;
  openFoodEditor: OpenFoodEditor;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [foodId, setFoodId] = useState(entry?.foodId ?? '');
  const [unit, setUnit] = useState(entry?.amount.unit ?? '');
  const unitOptionsId = useId();
  const load = useCallback((signal: AbortSignal) => request('food_search', {}, signal), [revision]);
  const foods = useResource(load);
  const { busy, error, run } = useMutation();
  const chosen = foods.data?.find((food) => food.id === foodId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const changedMeal = meals.find((value) => value === fieldText(form, 'meal')) ?? meal;
    const changedDate = fieldText(form, 'date') || date;
    const amount = { value: Number(fieldText(form, 'amount')), unit: unit.trim() };
    void run(async () => {
      if (entry) await request('diet_update', { id: entry.id, changes: { date: changedDate, meal: changedMeal, foodId, amount } });
      else await request('diet_create', { date, meal, items: [{ foodId, amount }] });
      onSaved();
    });
  }

  return <form className="cal-form cal-diet-form" onSubmit={submit}>
    <h3>{entry ? '修改记录' : '添加饮食记录'}</h3>
    {entry && <div className="cal-form-grid">
      <label className="cal-field">日期<input type="date" name="date" required defaultValue={entry.date} /></label>
      <label className="cal-field">餐别
        <select name="meal" defaultValue={entry.meal}>
          {meals.map((option) => <option key={option} value={option}>{mealLabels[option]}</option>)}
        </select>
      </label>
    </div>}
    <div className="cal-picker">
      <label className="cal-field">食物
        <select required value={foodId} disabled={!foods.data} onChange={(event) => {
          const id = event.target.value;
          setFoodId(id);
          setUnit(foods.data?.find((food) => food.id === id)?.nutrition.per.unit ?? '');
        }}>
          <option value="">{foods.data ? '选择食物' : '正在加载食物…'}</option>
          {foods.data?.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}
        </select>
      </label>
      {chosen && <EditButton label={`编辑${chosen.name}`} edit={() => openFoodEditor(chosen.id)} />}
      <button className="cal-button" type="button" onClick={() => openFoodEditor(undefined, (food) => {
        setFoodId(food.id);
        setUnit(food.nutrition.per.unit);
      })}>新增食物</button>
    </div>
    {foods.error && <ErrorNotice text={foods.error} retry={foods.refresh} />}
    <div className="cal-form-grid">
      <label className="cal-field">食用量
        <input type="number" name="amount" min="0.000001" step="any" required defaultValue={entry?.amount.value ?? 1} />
      </label>
      <label className="cal-field">单位
        <input required list={unitOptionsId} value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="g、碗、个" />
        <datalist id={unitOptionsId}>
          {chosen && <option value={chosen.nutrition.per.unit} />}
          {chosen?.portions?.map((portion) => <option key={portion.unit} value={portion.unit} />)}
        </datalist>
      </label>
    </div>
    {error && <ErrorNotice text={error} />}
    <div className="cal-actions">
      <button className="cal-button" type="button" onClick={onCancel} disabled={busy}>取消</button>
      <button className="cal-button cal-primary" type="submit" disabled={busy || !chosen}>{busy ? '正在保存…' : '保存记录'}</button>
    </div>
  </form>;
}
