import type { Food } from '../../core/contracts.ts';
import { basisText, gramText } from '../format.ts';
import { ChevronRightIcon } from '../icons.tsx';
import { Kcal } from '../ui.tsx';
import { nutrientFields } from './draft.ts';

type Props = { foods: Food[]; onOpen: (food: Food) => void };

export function FoodList({ foods, onOpen }: Props) {
  return <div className="cal-food-table" role="list">
    <div className="cal-food-head" aria-hidden="true">
      <span>名称</span><span>热量</span>
      {nutrientFields.map((field) => <span key={field.name} className="cal-col-nutrient">{field.label}</span>)}
      <span />
    </div>
    {foods.map((food) => <FoodRow key={food.id} food={food} onOpen={onOpen} />)}
  </div>;
}

function FoodRow({ food, onOpen }: { food: Food; onOpen: (food: Food) => void }) {
  const { per, values } = food.nutrition;
  const present = nutrientFields.filter((field) => values[field.name] !== undefined);
  return <div role="listitem">
    <button type="button" className="cal-food-row" onClick={() => onOpen(food)} data-food-id={food.id}>
      <span className="cal-food-cell-name">
        <strong>{food.name}</strong>
        <span className="cal-muted">{basisText(per)}</span>
      </span>
      <span className="cal-food-cell-energy"><Kcal value={values.energyKcal} /></span>
      {nutrientFields.map((field) => {
        const value = values[field.name];
        return <span key={field.name} className="cal-col-nutrient cal-num">
          {value === undefined ? <span className="cal-faint">—</span> : `${gramText(value)} ${field.unit}`}
        </span>;
      })}
      {present.length > 0 && <span className="cal-food-cell-brief cal-muted">
        {present.map((field) => `${field.label} ${gramText(values[field.name]!)}${field.unit}`).join(' · ')}
      </span>}
      <span className="cal-row-chevron" aria-hidden="true"><ChevronRightIcon size={16} /></span>
    </button>
  </div>;
}
