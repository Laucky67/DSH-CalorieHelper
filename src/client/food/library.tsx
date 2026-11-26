import { useCallback, useState } from 'react';
import type { Food } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { OpenFoodEditor } from '../app.tsx';
import { EditButton, ErrorNotice, Loading } from '../feedback.tsx';
import { energyText } from '../presentation.ts';
import { useMutation, useResource } from '../requests.ts';

export function FoodLibrary({ openFoodEditor, revision, active }: { openFoodEditor: OpenFoodEditor; revision: number; active: boolean }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;
  const [pendingDelete, setPendingDelete] = useState<Food>();
  const load = useCallback((signal: AbortSignal) => request('food_search', {
    query: query.trim() || undefined, limit: limit + 1, offset: page * limit,
  }, signal), [query, revision, page]);
  const resource = useResource(load, 4000, active);
  const remove = useMutation();

  function confirmDelete({ id, name, nutrition, portions }: Food) {
    void remove.run('food_delete', { id, expected: { name, nutrition, portions: portions ?? [] } }, () => {
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
      <input type="search" maxLength={160} value={query} onChange={(event) => { setPage(0); setQuery(event.target.value); }} placeholder="输入食物名称" />
    </label>
    {resource.error && <ErrorNotice text={resource.error} retry={resource.refresh} />}
    {!resource.error && resource.data === undefined && <Loading />}
    {resource.data?.length === 0 && <p className="cal-empty">{query.trim() ? '没有找到相关食物。' : '还没有食物。'}</p>}
    <ul className="cal-list">
      {resource.data?.slice(0, limit).map((food) => <li key={food.id} className="cal-library-item">
        <div className="cal-row">
          <div>
            <strong>{food.name}</strong>
            <p className="cal-secondary">每 {food.nutrition.per.value} {food.nutrition.per.unit} · {energyText(food.nutrition.values.energyKcal)} 千卡</p>
          </div>
          <div className="cal-row-actions">
            <EditButton label={`编辑${food.name}`} edit={() => openFoodEditor(food.id)} />
            <button className="cal-button cal-small" type="button" disabled={remove.busy} onClick={() => {
              remove.clearError();
              setPendingDelete(food);
            }}>删除</button>
          </div>
        </div>
        {pendingDelete?.id === food.id && <div className="cal-delete-prompt">
          <span>删除「{food.name}」？</span>
          <button autoFocus className="cal-button cal-small" type="button" onClick={() => setPendingDelete(undefined)} disabled={remove.busy}>取消</button>
          <button className="cal-button cal-danger cal-small" type="button" disabled={remove.busy} onClick={() => confirmDelete(pendingDelete)}>确认删除</button>
        </div>}
      </li>)}
    </ul>
    {(page > 0 || (resource.data?.length ?? 0) > limit) && <div className="cal-actions">
      <button className="cal-button cal-small" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>上一页</button>
      <button className="cal-button cal-small" type="button" disabled={(resource.data?.length ?? 0) <= limit} onClick={() => setPage((value) => value + 1)}>下一页</button>
    </div>}
    {remove.error && pendingDelete && <ErrorNotice text={remove.error} />}
  </section>;
}
