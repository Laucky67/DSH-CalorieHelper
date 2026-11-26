import { useRef } from 'react';
import { CloseIcon, PlusIcon } from '../icons.tsx';
import { FieldError, IconButton } from '../ui.tsx';
import { portionLimit, portionRow } from './draft.ts';
import type { FoodErrors, PortionRow } from './draft.ts';

type Props = {
  rows: PortionRow[];
  basisUnit: string;
  errors: FoodErrors;
  onChange: (rows: PortionRow[]) => void;
};

export function PortionsField({ rows, basisUnit, errors, onChange }: Props) {
  const groupRef = useRef<HTMLFieldSetElement>(null);
  const update = (key: number, patch: Partial<PortionRow>) => {
    onChange(rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  };
  const add = () => {
    onChange([...rows, portionRow(basisUnit.trim())]);
    window.requestAnimationFrame(() => {
      groupRef.current?.querySelector<HTMLInputElement>('li:last-child input')?.focus();
    });
  };
  const remove = (index: number) => {
    onChange(rows.filter((_, position) => position !== index));
    window.requestAnimationFrame(() => {
      const inputs = groupRef.current?.querySelectorAll<HTMLInputElement>('li input[data-first]') ?? [];
      const next = inputs[Math.min(index, inputs.length - 1)] ?? groupRef.current?.querySelector<HTMLButtonElement>('.cal-add-portion');
      next?.focus();
    });
  };

  return <fieldset className="cal-group" ref={groupRef}>
    <legend>份量换算</legend>
    {rows.length > 0 && <ol className="cal-portions">
      {rows.map((row, index) => {
        const error = errors[`portion-${row.key}`];
        const errorId = `cal-portion-error-${row.key}`;
        return <li key={row.key} className="cal-portion">
          <div className="cal-portion-line">
            <span className="cal-portion-one" aria-hidden="true">1</span>
            <input
              data-first name={`portionUnit${index}`} aria-label={`第 ${index + 1} 条份量的单位`} placeholder="碗"
              value={row.unit} maxLength={24} autoComplete="off"
              aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
              onChange={(event) => update(row.key, { unit: event.target.value })}
            />
            <span className="cal-portion-eq" aria-hidden="true">=</span>
            <input
              name={`portionValue${index}`} aria-label={`第 ${index + 1} 条份量的数量`} placeholder="150"
              inputMode="decimal" value={row.value} autoComplete="off"
              onChange={(event) => update(row.key, { value: event.target.value })}
            />
            <input
              name={`portionEqualsUnit${index}`} aria-label={`第 ${index + 1} 条份量的换算单位`} placeholder={basisUnit || 'g'}
              value={row.equalsUnit} maxLength={24} autoComplete="off"
              onChange={(event) => update(row.key, { equalsUnit: event.target.value })}
            />
            <IconButton label={`删除第 ${index + 1} 条份量`} icon={<CloseIcon size={14} />} onClick={() => remove(index)} />
          </div>
          <FieldError id={errorId}>{error}</FieldError>
        </li>;
      })}
    </ol>}
    {rows.length < portionLimit && <button type="button" className="cal-btn is-ghost is-small cal-add-portion" onClick={add}>
      <PlusIcon size={14} />添加份量
    </button>}
  </fieldset>;
}
