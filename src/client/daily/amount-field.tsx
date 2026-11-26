import type { Ref } from 'react';
import type { Food } from '../../core/contracts.ts';
import { estimatedEnergy } from '../energy.ts';
import { energyText } from '../presentation.ts';
import { FieldError } from '../ui.tsx';
import { unitChoices } from './data.ts';
import type { AmountErrors } from './data.ts';

type Props = {
  food: Food | undefined;
  amount: string;
  unit: string;
  errors: AmountErrors;
  amountRef: Ref<HTMLInputElement>;
  onAmount: (value: string) => void;
  onUnit: (value: string) => void;
};

/** 食用量：数量、单位、快捷单位与热量预览。 */
export function AmountField({ food, amount, unit, errors, amountRef, onAmount, onUnit }: Props) {
  const estimate = food ? estimatedEnergy(food, amount, unit) : undefined;
  const choices = food ? unitChoices(food) : [];
  const unknownUnit = Boolean(food && amount.trim() && unit.trim() && Number(amount) > 0 && estimate === undefined);
  const unitHint = errors.unit ?? (unknownUnit ? '这个单位算不出热量' : undefined);

  return <div className="cal-amount">
    <div className="cal-amount-line">
      <label className="cal-amount-value">
        <span className="cal-field-label">数量</span>
        <input
          ref={amountRef} name="amount" inputMode="decimal" autoComplete="off" value={amount}
          aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'cal-amount-error' : undefined}
          onChange={(event) => onAmount(event.target.value)}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <label className="cal-amount-unit">
        <span className="cal-field-label">单位</span>
        <input
          name="unit" autoComplete="off" maxLength={24} value={unit}
          aria-invalid={Boolean(unitHint)} aria-describedby={unitHint ? 'cal-unit-error' : undefined}
          onChange={(event) => onUnit(event.target.value)}
        />
      </label>
      <output className={`cal-estimate${estimate === undefined ? ' is-empty' : ''}`} aria-live="polite">
        {estimate === undefined ? '—' : <><span className="cal-estimate-approx">≈</span><b>{energyText(estimate)}</b><span className="cal-kcal-unit"> 千卡</span></>}
      </output>
    </div>
    {choices.length > 1 && <div className="cal-unit-chips" role="group" aria-label="常用单位">
      {choices.map((choice) => <button
        key={choice.unit} type="button" title={choice.hint}
        className={`cal-chip${choice.unit.trim().toLowerCase() === unit.trim().toLowerCase() ? ' is-on' : ''}`}
        onClick={() => onUnit(choice.unit)}
      >{choice.unit}</button>)}
    </div>}
    <FieldError id="cal-amount-error">{errors.amount}</FieldError>
    <FieldError id="cal-unit-error">{unitHint}</FieldError>
  </div>;
}
