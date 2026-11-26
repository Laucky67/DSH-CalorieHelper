import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import { createTracker } from '../core/tracker.ts';
import { createClientRoute } from './route.ts';
import { openPluginStorage } from './storage.ts';
import { registerTools } from './tools.ts';

export const name = 'calorie-helper';
export const inject = ['tools', 'connection', 'storageDomain'];

export async function apply(ctx: Context): Promise<void> {
  const storage = await openPluginStorage(ctx);
  ctx.effect(() => () => storage.close(), 'calorie-helper: storage');
  const tracker = createTracker(storage);

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/calorie-helper',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: createClientRoute(tracker),
  }), 'calorie-helper: page data');
  registerTools(ctx, tracker);
}
