import { heightMax, profileMeasureMin, weightMax } from '../../core/contracts.ts';
import type { Profile } from '../../core/contracts.ts';
import { request } from '../api.ts';
import type { ClientResult } from '../api.ts';
import { inRange, numberInput, parseNumber } from '../format.ts';

export type ProfileRecord = ClientResult<'profile_get'>;
type Sex = NonNullable<Profile['sex']>;
type Activity = NonNullable<Profile['activity']>;

export type ProfileDraft = {
  birthDate: string;
  sex: Sex | '';
  heightCm: string;
  weightKg: string;
  activity: Activity | '';
};
export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

/** 低于这个年龄时不估算维持热量。 */
export const estimateMinAge = 19;

export function isProfileComplete(draft: ProfileDraft): boolean {
  return Boolean(draft.birthDate && draft.sex && draft.heightCm.trim() && draft.weightKg.trim() && draft.activity);
}

export function timeZone(): string {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function loadProfile(signal?: AbortSignal): Promise<ProfileRecord> {
  return request('profile_get', { timeZone: timeZone() }, signal);
}

export function profileDraft(profile: ProfileRecord): ProfileDraft {
  return {
    birthDate: profile.birthDate ?? '',
    sex: profile.sex ?? '',
    heightCm: numberInput(profile.heightCm),
    weightKg: numberInput(profile.weightKg),
    activity: profile.activity ?? '',
  };
}

/** 校验并转换为保存内容。 */
export function readProfileDraft(draft: ProfileDraft): { profile?: Profile; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const height = parseNumber(draft.heightCm);
  const weight = parseNumber(draft.weightKg);
  if (height !== undefined && !inRange(height, profileMeasureMin, heightMax)) errors.heightCm = `请填写 ${heightMax} 以内的身高`;
  if (weight !== undefined && !inRange(weight, profileMeasureMin, weightMax)) errors.weightKg = `请填写 ${weightMax} 以内的体重`;
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    profile: {
      birthDate: draft.birthDate || undefined,
      sex: draft.sex || undefined,
      heightCm: height,
      weightKg: weight,
      activity: draft.activity || undefined,
    },
  };
}

/** 按今天计算的周岁；日期无效或在未来时返回 undefined。 */
export function ageOn(birthDate: string, today: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate > today) return undefined;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
