import { useState } from 'react';
import type { ReactNode } from 'react';
import type { DietItem, Meal } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { EditButton, ErrorNotice } from '../feedback.tsx';
import { energyText, mealLabels } from '../presentation.ts';
import { useMutation } from '../requests.ts';

export function MealCard({ meal, items, onAdd, onEdit, onRemoved, openFoodEditor, children }: {
  meal: Meal;
  items: DietItem[];
  onAdd: () => void;
  onEdit: (item: DietItem) => void;
  onRemoved: () => void;
  openFoodEditor: OpenFoodEditor;
  children?: ReactNode;
}) {
  const [pendingDelete, setPendingDelete] = useState<string>();
  const remove = useMutation();

  function confirmDelete(id: string) {
    void remove.run(async () => {
      await request('diet_delete', { id });
      setPendingDelete(undefined);
      onRemoved();
    });
  }

  return <section className="cal-card cal-meal" data-meal={meal}>
    <header className="cal-section-heading">
      <h2>{mealLabels[meal]}</h2>
      <button type="button" className="cal-button cal-small" onClick={onAdd} aria-label={`添加${mealLabels[meal]}记录`}>添加记录</button>
    </header>
    {items.length === 0 && !children && <p className="cal-empty">还没有记录。</p>}
    <ul className="cal-list">
      {items.map((entry) => <li key={entry.id}>
        <div className="cal-row">
          <div>
            <div className="cal-food-name">
              <strong>{entry.foodName}</strong>
              <EditButton label={`编辑${entry.foodName}的食物资料`} edit={() => openFoodEditor(entry.foodId)} />
            </div>
            <p className="cal-secondary">{entry.amount.value} {entry.amount.unit} · {energyText(entry.nutrition.energyKcal)} 千卡</p>
          </div>
          <div className="cal-row-actions">
            <button className="cal-button cal-small" type="button" onClick={() => onEdit(entry)}>修改记录</button>
            <button className="cal-button cal-small" type="button" disabled={remove.busy} onClick={() => {
              remove.clearError();
              setPendingDelete(entry.id);
            }}>删除</button>
          </div>
        </div>
        {pendingDelete === entry.id && <div className="cal-delete-prompt">
          <span>删除这条记录？</span>
          <button className="cal-button cal-small" type="button" onClick={() => setPendingDelete(undefined)} disabled={remove.busy}>取消</button>
          <button className="cal-button cal-danger cal-small" type="button" onClick={() => confirmDelete(entry.id)} disabled={remove.busy}>确认删除</button>
        </div>}
      </li>)}
    </ul>
    {remove.error && pendingDelete && <ErrorNotice text={remove.error} />}
    {children}
  </section>;
}
