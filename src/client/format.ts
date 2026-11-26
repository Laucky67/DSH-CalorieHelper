import type { Quantity } from '../core/contracts.ts';

const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const plainNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, useGrouping: false });
const tinyNumber = new Intl.NumberFormat('zh-CN', { maximumSignificantDigits: 3, useGrouping: false });
const gramNumber = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 });

function parts(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day, weekday: weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] };
}

/** 日期标题：今天、昨天、明天，其余显示月日。 */
export function dayName(date: string, today: string, yesterday: string, tomorrow: string): string {
  if (date === today) return '今天';
  if (date === yesterday) return '昨天';
  if (date === tomorrow) return '明天';
  const { year, month, day } = parts(date);
  return year === parts(today).year ? `${month}月${day}日` : `${year}年${month}月${day}日`;
}

/** 日期副标题：月日与星期。 */
export function dayDetail(date: string, today: string): string {
  const { year, month, day, weekday } = parts(date);
  const prefix = year === parts(today).year ? '' : `${year}年`;
  return `${prefix}${month}月${day}日 ${weekday}`;
}

export function numberText(value: number): string {
  const magnitude = Math.abs(value);
  return (magnitude > 0 && magnitude < 0.01 ? tinyNumber : plainNumber).format(value);
}

/** 填入输入框时使用的数字文本，不带分组符号。 */
export function numberInput(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function quantityText({ value, unit }: Quantity): string {
  return `${numberText(value)} ${unit}`;
}

export function basisText(per: Quantity): string {
  return per.value === 1 ? `每${per.unit}` : `每 ${quantityText(per)}`;
}

export function gramText(value: number): string {
  return gramNumber.format(value);
}

/** 输入框里的数字：空白返回 undefined，非法返回 NaN。 */
export function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return /^[+]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function inRange(value: number | undefined, min: number, max: number): value is number {
  return value !== undefined && Number.isFinite(value) && value >= min && value <= max;
}

export function visibleText(text: string): boolean {
  return /[^\s\p{Cf}\p{Cc}]/u.test(text);
}
