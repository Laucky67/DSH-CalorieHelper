import { useCallback, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { Food } from '../../core/contracts.ts';
import { confirmDiscard } from '../dirty.ts';
import { CloseIcon } from '../icons.tsx';
import { useResource } from '../requests.ts';
import { Banner, IconButton } from '../ui.tsx';
import { loadFood } from './data.ts';
import { FoodEditorForm } from './editor-form.tsx';

/** 要打开的食物：有 id 时编辑已有条目，否则新建。 */
export type FoodTarget = { id?: string; name?: string; allowDelete?: boolean };

type Props = {
  target: FoodTarget;
  onClose: () => void;
  onSaved: (food: Food) => void;
  onDeleted: () => void;
};

/** 从右侧滑出的食物编辑面板。 */
export function FoodEditor({ target, onClose, onSaved, onDeleted }: Props) {
  const dirty = useRef(false);
  const reportDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const close = useCallback(() => { if (confirmDiscard(dirty.current)) onClose(); }, [onClose]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault();
    close();
  };

  return <div className="cal-sheet-layer">
    <div className="cal-sheet-backdrop" onClick={close} />
    <section className="cal-sheet cal-editor" role="dialog" aria-modal="true" aria-labelledby="cal-editor-title" onKeyDown={onKeyDown}>
      <header className="cal-sheet-head">
        <h2 id="cal-editor-title">{target.id ? '编辑食物' : '新增食物'}</h2>
        <IconButton label="关闭" icon={<CloseIcon />} onClick={close} />
      </header>
      {target.id
        ? <ExistingFood id={target.id} allowDelete={Boolean(target.allowDelete)} onSaved={onSaved} onDeleted={onDeleted} onCancel={close} reportDirty={reportDirty} />
        : <FoodEditorForm initialName={target.name} onSaved={onSaved} onCancel={close} reportDirty={reportDirty} />}
    </section>
  </div>;
}

type ExistingProps = {
  id: string;
  allowDelete: boolean;
  onSaved: (food: Food) => void;
  onDeleted: () => void;
  onCancel: () => void;
  reportDirty: (dirty: boolean) => void;
};

function ExistingFood({ id, allowDelete, onSaved, onDeleted, onCancel, reportDirty }: ExistingProps) {
  const load = useCallback(async (signal: AbortSignal) => ({ food: await loadFood(id, signal) }), [id]);
  const { data, error, refresh } = useResource(load);

  if (data?.food) {
    return <FoodEditorForm
      key={data.food.id} original={data.food} allowDelete={allowDelete}
      onSaved={onSaved} onDeleted={onDeleted} onCancel={onCancel} reportDirty={reportDirty}
    />;
  }
  if (error) return <div className="cal-sheet-body"><Banner onRetry={refresh}>{error}</Banner></div>;
  if (!data) return <div className="cal-sheet-body" aria-busy="true"><div className="cal-skeleton is-tall" /></div>;
  return <div className="cal-sheet-body cal-empty">
    <p>这个食物已被删除。</p>
    <button type="button" className="cal-btn" onClick={onCancel}>返回</button>
  </div>;
}
