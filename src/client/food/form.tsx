import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { amountMax, amountMin, nutrientMax } from '../../core/contracts.ts';
import type { Food, FoodInput } from '../../core/contracts.ts';
import { fieldChanges } from '../edits.ts';
import { ErrorNotice } from '../feedback.tsx';
import { fieldText, optionalNumber } from '../presentation.ts';
import { useMutation } from '../requests.ts';

const nutrients = [
  ['proteinG', '蛋白质（克）'], ['fatG', '脂肪（克）'], ['carbsG', '碳水（克）'], ['calciumMg', '钙（毫克）'],
] as const;

export function FoodForm({ food, onSaved, onCancel, onDirty }: {
  food?: Food;
  onSaved: (food: Food) => void;
  onCancel: () => void;
  onDirty: () => void;
}) {
  const initialPortions = food?.portions ?? [];
  const [portionRows, setPortionRows] = useState(() => initialPortions.map((_portion, index) => index));
  const nextKey = useRef(initialPortions.length);
  const { busy, error, run } = useMutation();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: FoodInput['nutrition']['values'] = { energyKcal: Number(fieldText(form, 'energyKcal')) };
    for (const [key] of nutrients) {
      const amount = optionalNumber(form, key);
      if (amount !== undefined) values[key] = amount;
    }
    const portions = portionRows.map((key) => ({
      unit: fieldText(form, `unit-${key}`),
      equals: { value: Number(fieldText(form, `quantity-${key}`)), unit: fieldText(form, `base-${key}`) },
    }));
    const input: FoodInput = {
      name: fieldText(form, 'name'),
      nutrition: {
        per: { value: Number(fieldText(form, 'basisValue')), unit: fieldText(form, 'basisUnit') },
        values,
      },
      portions,
    };
    if (food) {
      const baseline: FoodInput = { name: food.name, nutrition: food.nutrition, portions: food.portions ?? [] };
      void run('food_update', { id: food.id, ...fieldChanges(baseline, input) }, onSaved);
    } else void run('food_create', input, onSaved);
  }

  return <form className="cal-form" onSubmit={submit} onChange={onDirty}>
    <fieldset className="cal-form-fields" disabled={busy}>
    <label className="cal-field">食物名称
      <input name="name" maxLength={160} required defaultValue={food?.name} placeholder="例如米饭或鸡腿堡" />
    </label>
    <fieldset className="cal-fieldset">
      <legend>营养资料</legend>
      <div className="cal-form-grid cal-form-three">
        <label className="cal-field">每
          <input type="number" name="basisValue" step="any" min={amountMin} max={amountMax} required defaultValue={food?.nutrition.per.value ?? 100} />
        </label>
        <label className="cal-field">单位
          <input name="basisUnit" maxLength={24} required defaultValue={food?.nutrition.per.unit ?? 'g'} placeholder="g、ml、个、片" />
        </label>
        <label className="cal-field">热量（千卡）
          <input type="number" name="energyKcal" step="any" min="0" max={nutrientMax} required defaultValue={food?.nutrition.values.energyKcal} />
        </label>
      </div>
      <div className="cal-form-grid">
        {nutrients.map(([key, label]) => <label key={key} className="cal-field">{label}
          <input type="number" name={key} step="any" min="0" max={nutrientMax} defaultValue={food?.nutrition.values[key]} />
        </label>)}
      </div>
    </fieldset>
    <fieldset className="cal-fieldset">
      <legend>份量换算</legend>
      {portionRows.map((key) => <div key={key} className="cal-portion-row">
        <label className="cal-field">份量单位
          <input name={`unit-${key}`} maxLength={24} placeholder="碗" required defaultValue={initialPortions[key]?.unit} />
        </label>
        <label className="cal-field">每 1 份量单位等于
          <input type="number" name={`quantity-${key}`} placeholder="150" step="any" min={amountMin} max={amountMax} required defaultValue={initialPortions[key]?.equals.value} />
        </label>
        <label className="cal-field">对应单位
          <input name={`base-${key}`} maxLength={24} placeholder="g" required defaultValue={initialPortions[key]?.equals.unit} />
        </label>
        <button type="button" className="cal-button cal-small" onClick={() => { onDirty(); setPortionRows((rows) => rows.filter((row) => row !== key)); }}>移除</button>
      </div>)}
      <button type="button" className="cal-button" disabled={portionRows.length >= 30} onClick={() => {
        const key = nextKey.current++;
        onDirty();
        setPortionRows((rows) => [...rows, key]);
      }}>添加份量换算</button>
    </fieldset>
    </fieldset>
    {error && <ErrorNotice text={error} />}
    <div className="cal-actions">
      <button type="button" className="cal-button" onClick={onCancel} disabled={busy}>取消</button>
      <button type="submit" className="cal-button cal-primary" disabled={busy}>{busy ? '正在保存…' : '保存食物'}</button>
    </div>
  </form>;
}
