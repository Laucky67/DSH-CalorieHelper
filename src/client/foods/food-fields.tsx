import type { InputHTMLAttributes } from 'react';
import { FieldError } from '../ui.tsx';
import { nutrientFields } from './draft.ts';
import type { FoodDraft, FoodErrors } from './draft.ts';
import { PortionsField } from './portions-field.tsx';

type Props = {
  draft: FoodDraft;
  errors: FoodErrors;
  onChange: (patch: Partial<FoodDraft>) => void;
};

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'name'> & {
  name: Exclude<keyof FoodDraft, 'portions'>;
  draft: FoodDraft;
  errors: FoodErrors;
  onChange: (patch: Partial<FoodDraft>) => void;
};

function DraftInput({ name, draft, errors, onChange, ...rest }: InputProps) {
  const error = errors[name];
  return <input
    {...rest} name={name} value={draft[name]} autoComplete="off"
    aria-invalid={Boolean(error)} aria-describedby={error ? `cal-food-error-${name}` : undefined}
    onChange={(event) => onChange({ [name]: event.target.value })}
  />;
}

/** 食物条目的全部输入项。 */
export function FoodFields({ draft, errors, onChange }: Props) {
  const shared = { draft, errors, onChange };
  return <>
    <label className="cal-field">
      <span className="cal-field-label">名称</span>
      <DraftInput {...shared} name="name" maxLength={160} autoFocus className="cal-input-lg" />
      <FieldError id="cal-food-error-name">{errors.name}</FieldError>
    </label>

    <fieldset className="cal-group">
      <legend>营养</legend>
      <div className="cal-basis">
        <span className="cal-basis-word">每</span>
        <DraftInput {...shared} name="basisValue" inputMode="decimal" aria-label="计量数量" className="cal-basis-value" />
        <DraftInput {...shared} name="basisUnit" maxLength={24} aria-label="计量单位" className="cal-basis-unit" />
      </div>
      <FieldError id="cal-food-error-basisValue">{errors.basisValue}</FieldError>
      <FieldError id="cal-food-error-basisUnit">{errors.basisUnit}</FieldError>

      <div className="cal-nutrients">
        <label className="cal-nutrient is-energy">
          <span className="cal-field-label">热量</span>
          <span className="cal-input-wrap">
            <DraftInput {...shared} name="energyKcal" inputMode="decimal" required aria-required="true" />
            <span className="cal-suffix">千卡</span>
          </span>
          <FieldError id="cal-food-error-energyKcal">{errors.energyKcal}</FieldError>
        </label>
        {nutrientFields.map((field) => <label key={field.name} className="cal-nutrient">
          <span className="cal-field-label">{field.label}</span>
          <span className="cal-input-wrap">
            <DraftInput {...shared} name={field.name} inputMode="decimal" placeholder="—" />
            <span className="cal-suffix">{field.unit}</span>
          </span>
          <FieldError id={`cal-food-error-${field.name}`}>{errors[field.name]}</FieldError>
        </label>)}
      </div>
    </fieldset>

    <PortionsField
      rows={draft.portions} basisUnit={draft.basisUnit} errors={errors}
      onChange={(portions) => onChange({ portions })}
    />
  </>;
}
