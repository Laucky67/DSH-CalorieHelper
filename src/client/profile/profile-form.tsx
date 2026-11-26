import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { activityLevels } from '../../core/choices.ts';
import { localDate } from '../../core/calendar.ts';
import type { Profile } from '../../core/contracts.ts';
import { useReportDirty } from '../dirty.ts';
import { AlertIcon, CheckIcon } from '../icons.tsx';
import { activityLabels } from '../presentation.ts';
import { useMutation, useUnsavedWarning } from '../requests.ts';
import { Banner, FieldError, Segmented } from '../ui.tsx';
import { ageOn, estimateMinAge, isProfileComplete, profileDraft, readProfileDraft, timeZone } from './draft.ts';
import type { ProfileDraft, ProfileErrors, ProfileRecord } from './draft.ts';

type Props = {
  profile: ProfileRecord;
  justSaved: boolean;
  onSaved: (profile: ProfileRecord) => void;
  onEdit: () => void;
  onReload: () => void;
  reportDirty: (dirty: boolean) => void;
};

type Activity = NonNullable<Profile['activity']>;

const sexOptions = [{ value: 'female', label: '女' }, { value: 'male', label: '男' }, { value: '', label: '不填' }] as const;
const activityHints: Record<Activity, string> = {
  inactive: '久坐为主，很少专门运动',
  'low-active': '每天约 30–60 分钟步行等轻度活动',
  active: '每天约 1–2 小时中等强度活动',
  'very-active': '体力劳动或每天高强度训练',
};

export function ProfileForm({ profile, justSaved, onSaved, onEdit, onReload, reportDirty }: Props) {
  const ids = useId();
  const initial = useMemo(() => profileDraft(profile), [profile]);
  const [draft, setDraft] = useState<ProfileDraft>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const save = useMutation();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useReportDirty(dirty, reportDirty);
  useUnsavedWarning(dirty);
  const today = localDate();
  const age = ageOn(draft.birthDate, today);

  const change = (patch: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof ProfileDraft>) delete next[key];
      return next;
    });
    save.clearError();
    onEdit();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const { profile: values, errors: found } = readProfileDraft(draft);
    setErrors(found);
    if (!values) {
      window.requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    void save.run('profile_save', { timeZone: timeZone(), expectedVersion: profile.version, ...values }, onSaved);
  };

  return <form className="cal-profile-form" onSubmit={submit} noValidate>
    <section className="cal-card cal-profile-card" aria-labelledby={`${ids}-basic`}>
      <h2 className="cal-profile-title" id={`${ids}-basic`}>基本信息</h2>
      <div className="cal-profile-grid">
        <label className="cal-field">
          <span className="cal-field-label">出生日期</span>
          <span className="cal-input-wrap">
            <input type="date" name="birthDate" max={today} value={draft.birthDate} onChange={(event) => change({ birthDate: event.target.value })} />
            {age !== undefined && <span className="cal-suffix">{age} 岁</span>}
          </span>
        </label>

        <div className="cal-field">
          <span className="cal-field-label">性别</span>
          <Segmented label="性别" name="sex" options={sexOptions} value={draft.sex} onChange={(sex) => change({ sex })} />
        </div>

        <label className="cal-field">
          <span className="cal-field-label">身高</span>
          <span className="cal-input-wrap">
            <input
              name="heightCm" inputMode="decimal" autoComplete="off" value={draft.heightCm}
              aria-invalid={Boolean(errors.heightCm)} onChange={(event) => change({ heightCm: event.target.value })}
            />
            <span className="cal-suffix">厘米</span>
          </span>
          <FieldError>{errors.heightCm}</FieldError>
        </label>

        <label className="cal-field">
          <span className="cal-field-label">体重</span>
          <span className="cal-input-wrap">
            <input
              name="weightKg" inputMode="decimal" autoComplete="off" value={draft.weightKg}
              aria-invalid={Boolean(errors.weightKg)} onChange={(event) => change({ weightKg: event.target.value })}
            />
            <span className="cal-suffix">千克</span>
          </span>
          <FieldError>{errors.weightKg}</FieldError>
        </label>
      </div>
    </section>

    <section className="cal-card cal-profile-card" aria-labelledby={`${ids}-activity`}>
      <h2 className="cal-profile-title" id={`${ids}-activity`}>日常活动等级</h2>
      <div className="cal-choices" role="radiogroup" aria-labelledby={`${ids}-activity`}>
        {activityLevels.map((level) => <label key={level} className="cal-choice">
          <input type="radio" name="activity" checked={draft.activity === level} onChange={() => change({ activity: level })} />
          <span className="cal-choice-title">{activityLabels[level]}</span>
          <span className="cal-choice-hint">{activityHints[level]}</span>
        </label>)}
        <label className="cal-choice is-none">
          <input type="radio" name="activity" checked={draft.activity === ''} onChange={() => change({ activity: '' })} />
          <span className="cal-choice-title">不填</span>
        </label>
      </div>
    </section>

    {age !== undefined && age < estimateMinAge
      ? <p className="cal-profile-note"><AlertIcon size={16} />未满 {estimateMinAge} 岁时不估算维持热量。</p>
      : !isProfileComplete(draft)
        ? <p className="cal-profile-note"><AlertIcon size={16} />填齐以上资料后，饮食记录会显示估算维持热量和热量差值。</p>
        : null}

    {save.error && <Banner onRetry={save.errorCode === 'CONFLICT' ? onReload : undefined}>{save.error}</Banner>}

    <footer className="cal-profile-foot">
      <span className={`cal-profile-status${justSaved && !dirty ? ' is-saved' : ''}`} aria-live="polite">
        {dirty
          ? '有未保存的修改'
          : justSaved
            ? <><CheckIcon size={15} />已保存，从今天起按新资料估算</>
            : '保存后从今天起生效，之前的日期仍按当时的资料估算'}
      </span>
      <button type="submit" className="cal-btn is-primary" disabled={!dirty || save.busy} aria-busy={save.busy}>
        {save.busy ? '正在保存…' : '保存'}
      </button>
    </footer>
  </form>;
}
