import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Food } from '../../core/contracts.ts';
import { useReportDirty } from '../dirty.ts';
import { fieldChanges } from '../edits.ts';
import { TrashIcon } from '../icons.tsx';
import { useMutation, useUnsavedWarning } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { comparableFood, emptyFoodDraft, foodDraft, readFoodDraft, sameFoodDraft } from './draft.ts';
import type { FoodDraft, FoodErrors } from './draft.ts';
import { FoodFields } from './food-fields.tsx';

type Props = {
  original?: Food;
  initialName?: string;
  allowDelete?: boolean;
  onSaved: (food: Food) => void;
  onDeleted?: () => void;
  onCancel: () => void;
  reportDirty: (dirty: boolean) => void;
};

export function FoodEditorForm({ original, initialName, allowDelete, onSaved, onDeleted, onCancel, reportDirty }: Props) {
  const initial = useMemo(() => original ? foodDraft(original) : emptyFoodDraft(initialName?.trim().slice(0, 160)), [original, initialName]);
  const [draft, setDraft] = useState<FoodDraft>(initial);
  const [errors, setErrors] = useState<FoodErrors>({});
  const [focusError, setFocusError] = useState(0);
  const save = useMutation();
  const remove = useMutation();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = !sameFoodDraft(draft, initial);
  useReportDirty(dirty, reportDirty);
  useUnsavedWarning(dirty);

  useEffect(() => {
    if (focusError) formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
  }, [focusError]);

  const change = (patch: Partial<FoodDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    save.clearError();
    remove.clearError();
    const touched = Object.keys(patch);
    setErrors((current) => {
      const next = { ...current };
      for (const key of touched) delete next[key];
      if (patch.portions) for (const key of Object.keys(next)) if (key.startsWith('portion-')) delete next[key];
      return next;
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.busy || remove.busy) return;
    const { input, errors: found } = readFoodDraft(draft, original);
    setErrors(found);
    if (!input) { setFocusError((value) => value + 1); return; }
    if (!original) { void save.run('food_create', input, onSaved); return; }
    const { changes, expected } = fieldChanges(comparableFood(original), input);
    if (!Object.keys(changes).length) { onCancel(); return; }
    void save.run('food_update', { id: original.id, changes, expected }, onSaved);
  };

  const destroy = () => {
    if (!original || !window.confirm(`删除「${original.name}」？`)) return;
    void remove.run('food_delete', { id: original.id, expected: comparableFood(original) }, () => onDeleted?.());
  };

  const failure = save.error ?? remove.error;
  return <form ref={formRef} className="cal-food-form" onSubmit={submit} noValidate>
    <div className="cal-sheet-body">
      <FoodFields draft={draft} errors={errors} onChange={change} />
    </div>
    <footer className="cal-sheet-foot">
      {failure && <Banner onDismiss={() => { save.clearError(); remove.clearError(); }}>{failure}</Banner>}
      <div className="cal-actions">
        {original && allowDelete && <button type="button" className="cal-btn is-danger-quiet" onClick={destroy} disabled={remove.busy || save.busy}>
          <TrashIcon size={15} />删除
        </button>}
        <span className="cal-spacer" />
        <button type="button" className="cal-btn is-quiet" onClick={onCancel}>取消</button>
        <button type="submit" className="cal-btn is-primary" disabled={save.busy || remove.busy} aria-busy={save.busy}>保存食物</button>
      </div>
    </footer>
  </form>;
}
