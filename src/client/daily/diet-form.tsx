import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { meals } from '../../core/choices.ts';
import type { DietItem, Food, Meal } from '../../core/contracts.ts';
import { useReportDirty } from '../dirty.ts';
import { fieldChanges } from '../edits.ts';
import { loadFood } from '../foods/data.ts';
import type { FoodTarget } from '../foods/editor.tsx';
import { basisText, numberInput } from '../format.ts';
import { energyText, mealLabels } from '../presentation.ts';
import { useMutation, useUnsavedWarning } from '../requests.ts';
import { Banner, FieldError, Segmented } from '../ui.tsx';
import { AmountField } from './amount-field.tsx';
import { amountForSwitch, defaultAmount, entryOf, readAmount } from './data.ts';
import type { AmountErrors } from './data.ts';
import { FoodPicker } from './food-picker.tsx';

export type OpenFood = (target: FoodTarget, onSaved?: (food: Food) => void) => void;

type Props = {
  /** 添加时所在的日期。 */
  date: string;
  meal: Meal;
  /** 有值时为修改这条记录。 */
  item?: DietItem;
  revision: number;
  onOpenFood: OpenFood;
  onCancel: () => void;
  onSaved: () => void;
  reportDirty: (dirty: boolean) => void;
};

type Chosen = { id: string; name: string; food?: Food };
type FormErrors = AmountErrors & { food?: string; date?: string };
const mealOptions = meals.map((value) => ({ value, label: mealLabels[value] }));

export function DietForm({ date, meal: initialMeal, item, revision, onOpenFood, onCancel, onSaved, reportDirty }: Props) {
  const initialAmount = item ? numberInput(item.amount.value) : '';
  const [chosen, setChosen] = useState<Chosen | undefined>(item ? { id: item.foodId, name: item.foodName } : undefined);
  const [picking, setPicking] = useState(!item);
  const [amount, setAmount] = useState(initialAmount);
  const [unit, setUnit] = useState(item?.amount.unit ?? '');
  const [meal, setMeal] = useState<Meal>(item?.meal ?? initialMeal);
  const [entryDate, setEntryDate] = useState(item?.date ?? date);
  const [errors, setErrors] = useState<FormErrors>({});
  const [focusAmount, setFocusAmount] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);
  const save = useMutation();
  const groupName = useId();

  const dirty = item
    ? chosen?.id !== item.foodId || amount !== initialAmount || unit !== item.amount.unit || meal !== item.meal || entryDate !== item.date
    : chosen !== undefined;
  useReportDirty(dirty, reportDirty);
  useUnsavedWarning(dirty);

  useEffect(() => { if (focusAmount) amountRef.current?.focus(); }, [focusAmount]);

  // 读取选中食物的完整资料，用于单位选择与热量预览；食物被修改后重新读取。
  const chosenId = chosen?.id;
  useEffect(() => {
    if (!chosenId) return;
    const controller = new AbortController();
    loadFood(chosenId, controller.signal).then((food) => {
      if (food) setChosen((current) => current?.id === chosenId ? { id: food.id, name: food.name, food } : current);
    }, () => { /* 读取失败时只是没有预览，保存不受影响。 */ });
    return () => controller.abort();
  }, [chosenId, revision]);

  const touched = (clear: Array<keyof FormErrors>) => {
    save.clearError();
    setErrors((current) => {
      const next = { ...current };
      for (const key of clear) delete next[key];
      return next;
    });
  };

  const pick = (food: Food) => {
    const next = amount.trim() ? amountForSwitch(food, amount, unit) : defaultAmount(food);
    setChosen({ id: food.id, name: food.name, food });
    setAmount(next.amount);
    setUnit(next.unit);
    setPicking(false);
    touched(['food', 'amount', 'unit']);
    setFocusAmount((value) => value + 1);
  };

  const createFood = (name: string) => onOpenFood({ name }, pick);

  const submitWith = (ifAlreadySaved?: 'use_saved' | 'add_another') => {
    if (save.busy) return;
    const { quantity, errors: found } = readAmount(amount, unit);
    const problems: FormErrors = { ...found };
    if (!chosen) problems.food = '请选择食物';
    if (item && !entryDate) problems.date = '请选择日期';
    setErrors(problems);
    if (!chosen || !quantity || problems.date) {
      if (chosen && !picking) setFocusAmount((value) => value + 1);
      return;
    }
    if (!item) {
      void save.run('diet_create', {
        date, meal, items: [{ foodId: chosen.id, amount: quantity }], ifAlreadySaved,
      }, () => onSaved());
      return;
    }
    const { changes, expected } = fieldChanges(entryOf(item), { date: entryDate, meal, foodId: chosen.id, amount: quantity });
    if (!Object.keys(changes).length) { onSaved(); return; }
    void save.run('diet_update', { id: item.id, changes, expected }, () => onSaved());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    submitWith();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    onCancel();
  };

  const unitError = save.errorCode === 'INVALID_UNIT' ? save.error : errors.unit;
  const alreadySaved = save.errorCode === 'MEAL_ALREADY_SAVED';
  const generalError = save.error && !alreadySaved && save.errorCode !== 'INVALID_UNIT' ? save.error : undefined;
  const showAmount = chosen !== undefined && !picking;

  return <form className={`cal-diet-form${item ? ' is-edit' : ''}`} onSubmit={submit} onKeyDown={onKeyDown} noValidate>
    {item && <div className="cal-form-meta">
      <Segmented
        label="餐别" name={`meal${groupName}`} options={mealOptions} value={meal}
        onChange={(value) => { setMeal(value); touched([]); }}
      />
      <label className="cal-entry-date">
        <span className="cal-visually-hidden">日期</span>
        <input
          type="date" name="entryDate" value={entryDate} aria-invalid={Boolean(errors.date)}
          onChange={(event) => { setEntryDate(event.target.value); touched(['date']); }}
        />
      </label>
    </div>}

    {showAmount
      ? <div className="cal-picked" data-food-id={chosen.id}>
        <span className="cal-picked-text">
          <strong>{chosen.name}</strong>
          {chosen.food && <span className="cal-muted">
            {basisText(chosen.food.nutrition.per)} · {energyText(chosen.food.nutrition.values.energyKcal)} 千卡
          </span>}
        </span>
        <button type="button" className="cal-link" onClick={() => setPicking(true)}>更换</button>
      </div>
      : <FoodPicker
        revision={revision} onPick={pick} onCreate={createFood}
        onDismiss={chosen ? () => setPicking(false) : undefined}
      />}
    <FieldError>{errors.food}</FieldError>

    {showAmount && <AmountField
      food={chosen.food} amount={amount} unit={unit} amountRef={amountRef}
      errors={{ amount: errors.amount, unit: unitError }}
      onAmount={(value) => { setAmount(value); touched(['amount']); }}
      onUnit={(value) => { setUnit(value); touched(['unit']); }}
    />}

    {generalError && <Banner>{generalError}</Banner>}

    {alreadySaved
      ? <div className="cal-choice" role="alert">
        <p>{save.error}</p>
        <div className="cal-actions">
          <button type="button" className="cal-btn is-quiet" onClick={onCancel}>取消</button>
          <span className="cal-spacer" />
          <button type="button" className="cal-btn" disabled={save.busy} onClick={() => submitWith('add_another')}>再记一条</button>
          <button type="button" className="cal-btn is-primary" disabled={save.busy} onClick={() => submitWith('use_saved')}>沿用已保存的记录</button>
        </div>
      </div>
      : <div className="cal-actions">
        <span className="cal-spacer" />
        <button type="button" className="cal-btn is-quiet" onClick={onCancel}>取消</button>
        {chosen && <button type="submit" className="cal-btn is-primary" disabled={save.busy} aria-busy={save.busy}>保存记录</button>}
      </div>}
  </form>;
}
