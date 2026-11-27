import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import { createTracker } from '../core/tracker.ts';
import type { Tracker } from '../core/tracker.ts';
import { TrackerError } from '../core/errors.ts';
import { describeFailure } from './failures.ts';
import { createClientRoute } from './route.ts';
import { registerMealSkill } from './skills.ts';
import { openPluginStorage } from './storage.ts';
import { registerTools } from './tools.ts';

export const name = 'calorie-helper';
export const inject = ['tools', 'connection', 'storageDomain', 'skills'];

export function apply(ctx: Context): void {
  registerMealSkill(ctx, new URL('../skills/meal-logging/SKILL.md', import.meta.url));
  let disposed = false;
  let close: (() => void) | undefined;
  let pending: Promise<Tracker> | undefined;
  ctx.effect(() => () => { disposed = true; close?.(); }, 'calorie-helper: storage');
  function getTracker(): Promise<Tracker> {
    pending ??= openPluginStorage(ctx).then((storage) => {
      if (disposed) {
        storage.close();
        throw new TrackerError('请重新打开卡路里记录。', undefined, 'CANCELLED');
      }
      close = () => storage.close();
      return createTracker(storage);
    }).catch((error: unknown) => {
      pending = undefined;
      const failure = describeFailure('open_database', error);
      if (error instanceof TrackerError && error.code === 'STORAGE_FAILURE') console.warn('calorie-helper: upgrade stopped');
      throw failure;
    });
    return pending;
  }

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/calorie-helper',
    methods: ['POST'],
    requestBody: 'streaming',
    fetch: createClientRoute(getTracker),
  }), 'calorie-helper: page data');
  registerTools(ctx, getTracker);
  void getTracker().catch(() => { /* The page and tools report the issue and can retry. */ });
}
