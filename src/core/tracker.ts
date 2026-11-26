import { createHash } from 'node:crypto';
import { localDate } from './calendar.ts';
import { unchanged } from './changes.ts';
import { clientSchemas, toolSchemas } from './contracts.ts';
import { addEntries, deleteEntry, editEntry, queryEntries } from './diets.ts';
import { TrackerError, validated } from './errors.ts';
import { addFood, deleteFood, editFood, searchFoods } from './foods.ts';
import { summarize } from './profiles.ts';
import type { TrackerRepository } from './repository.ts';

function fingerprint(input: object): string {
  const canonical = JSON.stringify(input, (_key, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function createTracker(repo: TrackerRepository, today = (timeZone?: string) => localDate(new Date(), timeZone)) {
  function write<Result>(action: string, data: { operationId?: string }, change: () => Result, signal?: AbortSignal): Result {
    const { operationId, ...input } = data;
    if (signal?.aborted) throw new TrackerError('操作已取消。', undefined, 'CANCELLED');
    return repo.write(() => {
      const digest = operationId ? fingerprint(input) : undefined;
      if (operationId && digest) {
        const receipt = repo.receipt(action, operationId);
        if (receipt) {
          if (receipt.input !== digest) throw new TrackerError('本次重试的内容与先前提交不一致。', undefined, 'CONFLICT');
          return JSON.parse(receipt.result) as Result;
        }
      }
      const result = change();
      if (signal?.aborted) throw new TrackerError('操作已取消。', undefined, 'CANCELLED');
      if (operationId && digest) repo.putReceipt(action, operationId, digest, JSON.stringify(result));
      return result;
    });
  }

  return {
    async food_create(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.food_create, input, '请输入食物名称和有效的营养资料。');
      const { operationId: _receipt, ...food } = data;
      return write('food_create', data, () => addFood(repo, food), signal);
    },
    async food_search(input: unknown) {
      return searchFoods(repo, validated(toolSchemas.food_search, input, '请输入要查找的食物。'));
    },
    async food_update(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.food_update, input, '请检查要修改的食物资料。');
      return write('food_update', data, () => editFood(repo, data), signal);
    },
    async food_delete(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.food_delete, input, '请选择要删除的食物。');
      return write('food_delete', data, () => deleteFood(repo, data.id), signal);
    },
    async diet_create(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.diet_create, input, '请检查日期、餐别、食物和食用量。');
      return write('diet_create', data, () => addEntries(repo, data), signal);
    },
    async diet_query(input: unknown) {
      return queryEntries(repo, validated(toolSchemas.diet_query, input, '请选择日期或饮食记录。'), 100);
    },
    async diet_update(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.diet_update, input, '请检查要修改的饮食记录。');
      return write('diet_update', data, () => editEntry(repo, data), signal);
    },
    async diet_delete(input: unknown, signal?: AbortSignal) {
      const data = validated(toolSchemas.diet_delete, input, '请选择要删除的饮食记录。');
      return write('diet_delete', data, () => deleteEntry(repo, data.id), signal);
    },
    async daily_summary(input: unknown) {
      const { date } = validated(clientSchemas.daily_summary, input, '请选择有效的日期。');
      return repo.read(() => summarize(repo, date));
    },
    async profile_get(input: unknown = {}) {
      const { timeZone } = validated(clientSchemas.profile_get, input, '请检查设备时区后重试。');
      const current = repo.profileOn(today(timeZone));
      return { ...current?.profile, version: current?.version ?? null };
    },
    async profile_save(input: unknown, signal?: AbortSignal) {
      const data = validated(clientSchemas.profile_save, input, '请检查个人资料和设备时区。');
      const { timeZone, expectedVersion, operationId: _receipt, ...profile } = data;
      const effectiveDate = today(timeZone);
      return write('profile_save', data, () => {
        if (profile.birthDate && profile.birthDate > effectiveDate) throw new TrackerError('出生日期应为今天或更早。');
        const current = repo.profileOn(effectiveDate);
        const version = current?.version ?? null;
        if (expectedVersion !== undefined && expectedVersion !== version) {
          throw new TrackerError('个人资料已在另一处更新。请重新打开资料页，核对后再保存。', undefined, 'CONFLICT');
        }
        if (unchanged(current?.profile ?? {}, profile)) return { ...profile, version };
        return { ...profile, version: repo.appendProfile(effectiveDate, profile) };
      }, signal);
    },
  };
}

export type Tracker = ReturnType<typeof createTracker>;
