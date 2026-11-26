import type { DietItem } from '../../core/contracts.ts';
import { quantityText } from '../format.ts';
import { FoodCardIcon, TrashIcon } from '../icons.tsx';
import { IconButton, Kcal } from '../ui.tsx';

type Props = {
  item: DietItem;
  busy: boolean;
  onEdit: (item: DietItem) => void;
  onDelete: (item: DietItem) => void;
  onOpenFood: (item: DietItem) => void;
};

export function ItemRow({ item, busy, onEdit, onDelete, onOpenFood }: Props) {
  return <li className="cal-item" data-item-id={item.id}>
    <button type="button" className="cal-item-main" onClick={() => onEdit(item)} title="修改这条记录">
      <span className="cal-food-name">
        <strong>{item.foodName}</strong>
        <span className="cal-item-amount">{quantityText(item.amount)}</span>
      </span>
      <Kcal value={item.nutrition.energyKcal} className="cal-item-kcal" />
    </button>
    <span className="cal-item-actions">
      <IconButton label={`编辑${item.foodName}的食物资料`} icon={<FoodCardIcon size={16} />} onClick={() => onOpenFood(item)} />
      <IconButton label={`删除${item.foodName}记录`} tone="danger" icon={<TrashIcon size={16} />} disabled={busy} onClick={() => onDelete(item)} />
    </span>
  </li>;
}
