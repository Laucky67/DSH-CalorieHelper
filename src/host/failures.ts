import { randomUUID } from 'node:crypto';
import { TrackerError } from '../core/errors.ts';
import type { ErrorCode } from '../core/errors.ts';
import { isBusy, sqliteErrorCode } from '../storage/sqlite-errors.ts';

export const status: Record<ErrorCode, number> = {
  INVALID_INPUT: 400, INVALID_UNIT: 400, NOT_FOUND: 404, CONFLICT: 409, FOOD_IN_USE: 409,
  CANCELLED: 408, BUSY: 503, STORAGE_FAILURE: 500,
};

export function describeFailure(action: string, error: unknown): TrackerError {
  if (error instanceof TrackerError) return error;
  const detail = typeof error === 'object' && error !== null ? error : {};
  const sqliteCode = sqliteErrorCode(error);
  if (isBusy(error)) return new TrackerError('数据正在被另一处保存，请稍后重试。', undefined, 'BUSY');

  const trace = randomUUID().slice(0, 8);
  const code = 'code' in detail && typeof detail.code === 'string' && /^[A-Z0-9_]+$/.test(detail.code) ? detail.code : 'UNKNOWN';
  console.error('calorie-helper storage failure', { action, trace, code, sqliteCode });
  const message = sqliteCode === 11 || sqliteCode === 26 ? '卡路里数据库无法读取。请从可用的数据库备份恢复。'
    : sqliteCode === 8 || sqliteCode === 14 || code === 'EACCES' || code === 'EPERM'
    ? '无法写入卡路里数据，请检查数据目录权限。'
    : sqliteCode === 13 || code === 'ENOSPC' ? '存储空间不足，请腾出空间后重试。'
    : '暂时无法确认操作结果，请重试同一操作。';
  return new TrackerError(message, undefined, 'STORAGE_FAILURE');
}
