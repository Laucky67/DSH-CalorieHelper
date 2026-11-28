import { useId } from 'react';
import { activityLevels, tdeeMethods } from '../../core/choices.ts';
import { ChevronDownIcon } from '../icons.tsx';
import { activityLabels } from '../presentation.ts';
import { FieldError } from '../ui.tsx';
import type { ProfileDraft, ProfileErrors } from './draft.ts';

const methodDetails = {
  'nasem-2023': {
    name: 'NASEM 2023',
    description: '根据年龄、性别、身高、体重和日常活动等级，直接估算全天维持热量。',
  },
  'mifflin-st-jeor': {
    name: 'Mifflin–St Jeor',
    description: '根据年龄、性别、身高和体重估算静息消耗，再结合日常活动等级估算全天维持热量。',
  },
};

const nasemHints = {
  inactive: '久坐为主，很少专门运动',
  'low-active': '每天约 30–60 分钟步行等轻度活动',
  active: '每天约 1–2 小时中等强度活动',
  'very-active': '体力劳动或每天高强度训练',
};
const mifflinOptions = {
  inactive: { label: '久坐', hint: '久坐为主，很少运动' },
  'low-active': { label: '轻度活动', hint: '每周约 1–3 天轻度运动' },
  active: { label: '中度活动', hint: '每周约 3–5 天中等强度运动' },
  'very-active': { label: '高度活动', hint: '每周约 6–7 天高强度运动' },
};

type Props = {
  draft: ProfileDraft;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileDraft>) => void;
};

export function TdeeSettings({ draft, onChange }: Props) {
  const id = useId();
  return <details className="cal-card cal-profile-advanced">
    <summary className="cal-profile-advanced-toggle">高级<ChevronDownIcon size={18} /></summary>
    <div className="cal-profile-advanced-content">
      <h2 className="cal-profile-title" id={`${id}-method`}>TDEE 计算方案</h2>
      <div className="cal-choices" role="radiogroup" aria-labelledby={`${id}-method`}>
        {tdeeMethods.map((method) => <label className="cal-choice" key={method}>
          <input type="radio" name="tdeeMethod" checked={draft.tdeeMethod === method} onChange={() => onChange({ tdeeMethod: method })} />
          <span className="cal-choice-title">{methodDetails[method].name}</span>
          <span className="cal-choice-hint">{methodDetails[method].description}</span>
        </label>)}
      </div>
    </div>
  </details>;
}

export function ActivitySettings({ draft, errors, onChange }: Props) {
  const id = useId();
  const activityField = draft.tdeeMethod === 'mifflin-st-jeor' ? 'mifflinActivity' : 'activity';
  const error = errors[activityField];
  return <section className="cal-card cal-profile-card" aria-labelledby={`${id}-activity`}>
      <h2 className="cal-profile-title" id={`${id}-activity`}>日常活动等级</h2>
      <div className="cal-choices" role="radiogroup" aria-labelledby={`${id}-activity`} aria-describedby={error ? `${id}-error` : undefined}>
        {activityLevels.map((level) => <label key={level} className="cal-choice">
          <input
            type="radio" name="activity" checked={draft[activityField] === level} aria-invalid={Boolean(error)}
            onChange={() => onChange({ [activityField]: level })}
          />
          <span className="cal-choice-title">{draft.tdeeMethod === 'mifflin-st-jeor' ? mifflinOptions[level].label : activityLabels[level]}</span>
          <span className="cal-choice-hint">{draft.tdeeMethod === 'mifflin-st-jeor' ? mifflinOptions[level].hint : nasemHints[level]}</span>
        </label>)}
        {activityField === 'activity' && <label className="cal-choice is-none">
          <input type="radio" name="activity" checked={draft.activity === ''} onChange={() => onChange({ activity: '' })} />
          <span className="cal-choice-title">不填</span>
        </label>}
      </div>
      <div id={`${id}-error`}><FieldError>{error}</FieldError></div>
    </section>;
}
