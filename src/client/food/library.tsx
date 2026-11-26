import { useCallback, useState } from 'react';
import type { Food } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { EditButton, ErrorNotice, Loading } from '../feedback.tsx';
import { energyText } from '../presentation.ts';
import { useMutation, useResource } from '../requests.ts';

export function FoodLibrary({ openFoodEditor, revision }: { openFoodEditor: OpenFoodEditor; revision: number }) {
  const [query, setQuery] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Food>();
  const load = useCallback((signal: AbortSignal) => request('food_search', { query: query.trim() || undefined }, signal), [query, revision]);
  const resource = useResource(load);
  const remove = useMutation();

  function confirmDelete(food: Food) {
    void remove.run(async () => {
      await request('food_delete', { id: food.id });
      setPendingDelete(undefined);
      resource.refresh();
    });
  }

  return <section className="cal-card cal-library">
    <div className="cal-section-heading">
      <h2>食物库</h2>
      <button className="cal-button cal-primary" type="button" onClick={() => openFoodEditor()}>新增食物</button>
    </div>
    <label className="cal-field cal-search">搜索食物
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入食物名称" />
    </label>
    {resource.error && <ErrorNotice text={resource.error} retry={resource.refresh} />}
    {!resource.error && resource.data === undefined && <Loading />}
    {resource.data?.length === 0 && <p className="cal-empty">{query.trim() ? '没有找到相关食物。' : '还没有食物。'}</p>}
    <ul className="cal-list">
      {resource.data?.map((food) => <li key={food.id} className="cal-library-item">
        <div className="cal-row">
          <div>
            <strong>{food.name}</strong>
            <p className="cal-secondary">每 {food.nutrition.per.value} {food.nutrition.per.unit} · {energyText(food.nutrition.values.energyKcal)} 千卡</p>
          </div>
          <div className="cal-row-actions">
            <EditButton label={`编辑${food.name}`} edit={() => openFoodEditor(food.id)} />
            <button className="cal-button cal-small" type="button" onClick={() => setPendingDelete(food)}>删除</button>
          </div>
        </div>
        {pendingDelete?.id === food.id && <div className="cal-delete-prompt">
          <span>删除「{food.name}」？</span>
          <button className="cal-button cal-small" type="button" onClick={() => setPendingDelete(undefined)} disabled={remove.busy}>取消</button>
          <button className="cal-button cal-danger cal-small" type="button" disabled={remove.busy} onClick={() => confirmDelete(food)}>确认删除</button>
        </div>}
      </li>)}
    </ul>
    {remove.error && pendingDelete && <ErrorNotice text={remove.error} />}
  </section>;
}
