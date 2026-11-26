import { useCallback, useEffect, useRef } from 'react';
import type { Food } from '../../core/contracts.ts';
import { request, RequestError } from '../api.ts';
import { ErrorNotice, Loading } from '../feedback.tsx';
import { useResource } from '../requests.ts';
import { FoodForm } from './form.tsx';

export function FoodEditor({ id, onSaved, onCancel, onDirty }: {
  id?: string;
  onSaved: (food: Food) => void;
  onCancel: () => void;
  onDirty: () => void;
}) {
  const load = useCallback(async (signal: AbortSignal) => {
    if (!id) return null;
    const [food] = await request('food_search', { id }, signal);
    if (!food) throw new RequestError('找不到这条食物，请返回食物库。', 'NOT_FOUND');
    return food;
  }, [id]);
  const resource = useResource(load);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="cal-card cal-editor">
    <div className="cal-section-heading">
      <h2 ref={heading} tabIndex={-1}>{id ? '编辑食物' : '新增食物'}</h2>
      <button className="cal-button cal-small" type="button" onClick={onCancel}>返回</button>
    </div>
    {resource.error
      ? <ErrorNotice text={resource.error} retry={resource.errorCode === 'NOT_FOUND' ? undefined : resource.refresh} />
      : resource.data === undefined
        ? <Loading />
        : <FoodForm food={resource.data ?? undefined} onSaved={onSaved} onCancel={onCancel} onDirty={onDirty} />}
  </section>;
}
