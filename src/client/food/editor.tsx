import { useCallback } from 'react';
import type { Food, FoodInput } from '../../core/contracts.ts';
import { request } from '../api.ts';
import { ErrorNotice, Loading } from '../feedback.tsx';
import { useResource } from '../requests.ts';
import { FoodForm } from './form.tsx';

export function FoodEditor({ id, onSaved, onCancel }: {
  id?: string;
  onSaved: (food: Food) => void;
  onCancel: () => void;
}) {
  const load = useCallback(async (signal: AbortSignal) => {
    if (!id) return null;
    const [food] = await request('food_search', { id }, signal);
    if (!food) throw new Error('找不到该食物，请返回食物库重试。');
    return food;
  }, [id]);
  const resource = useResource(load);

  async function save(data: FoodInput) {
    const saved = id ? await request('food_update', { id, changes: data }) : await request('food_create', data);
    onSaved(saved);
  }

  return <section className="cal-card cal-editor">
    <div className="cal-section-heading">
      <h2>{id ? '编辑食物' : '新增食物'}</h2>
      <button className="cal-button cal-small" type="button" onClick={onCancel}>返回</button>
    </div>
    {resource.error
      ? <ErrorNotice text={resource.error} retry={resource.refresh} />
      : resource.data === undefined
        ? <Loading />
        : <FoodForm food={resource.data ?? undefined} onSave={save} onCancel={onCancel} />}
  </section>;
}
