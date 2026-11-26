import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { activityLevels } from '../../core/choices.ts';
import type { Profile } from '../../core/contracts.ts';
import { request } from '../api.ts';
import { ErrorNotice, Loading } from '../feedback.tsx';
import { activityLabels, fieldText, optionalNumber } from '../presentation.ts';
import { useMutation, useResource } from '../requests.ts';

export function ProfilePage({ onSaved }: { onSaved: () => void }) {
  const load = useCallback((signal: AbortSignal) => request('profile_get', {}, signal), []);
  const resource = useResource(load);

  return <section className="cal-card cal-editor">
    <div className="cal-section-heading"><h2>个人资料</h2></div>
    {resource.error
      ? <ErrorNotice text={resource.error} retry={resource.refresh} />
      : resource.data
        ? <ProfileForm profile={resource.data} onSaved={onSaved} />
        : <Loading />}
  </section>;
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const { busy, error, run } = useMutation();
  const [saved, setSaved] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sex = fieldText(form, 'sex');
    const activity = fieldText(form, 'activity');
    void run(async () => {
      await request('profile_save', {
        birthDate: fieldText(form, 'birthDate') || undefined,
        sex: sex === 'female' || sex === 'male' ? sex : undefined,
        heightCm: optionalNumber(form, 'heightCm'),
        weightKg: optionalNumber(form, 'weightKg'),
        activity: activityLevels.find((level) => level === activity),
      });
      setSaved(true);
      onSaved();
    });
  }

  return <form className="cal-form" onChange={() => setSaved(false)} onSubmit={submit}>
    <div className="cal-form-grid">
      <label className="cal-field">出生日期<input name="birthDate" type="date" defaultValue={profile.birthDate} /></label>
      <label className="cal-field">性别
        <select name="sex" defaultValue={profile.sex ?? ''}>
          <option value="">请选择</option><option value="female">女</option><option value="male">男</option>
        </select>
      </label>
      <label className="cal-field">身高（厘米）<input name="heightCm" type="number" min="0.01" step="any" defaultValue={profile.heightCm} /></label>
      <label className="cal-field">体重（千克）<input name="weightKg" type="number" min="0.01" step="any" defaultValue={profile.weightKg} /></label>
    </div>
    <label className="cal-field">日常活动等级
      <select name="activity" defaultValue={profile.activity ?? ''}>
        <option value="">请选择</option>
        {activityLevels.map((level) => <option key={level} value={level}>{activityLabels[level]}</option>)}
      </select>
    </label>
    <p className="cal-secondary">可参考平时的工作、通勤、家务和运动。</p>
    {error && <ErrorNotice text={error} />}
    <div className="cal-actions">
      {saved && <span role="status">已保存</span>}
      <button className="cal-button cal-primary" type="submit" disabled={busy}>{busy ? '正在保存…' : '保存资料'}</button>
    </div>
  </form>;
}
