import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-connection';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { trackerStateSchema } from '../core/state.ts';
import type { TrackerState } from '../core/state.ts';
import { createTracker } from '../core/tracker.ts';
import { createClientRoute } from './route.ts';
import { registerTools } from './tools.ts';

const initial: TrackerState = { foods: [], entries: [], profiles: [] };
const domainSpec = defineDomain({
  name: 'calorie_helper',
  version: 1,
  global: { schema: trackerStateSchema, initial },
  tables: {},
});

export const name = 'calorie-helper';
export const inject = ['tools', 'connection', 'storageDomain'];

export async function apply(ctx: Context): Promise<void> {
  const domain = await ctx.storageDomain.open(domainSpec);
  ctx.effect(() => () => domain.close(), 'calorie-helper: storage');
  const tracker = createTracker({
    async load() { return domain.global.get(); },
    save: (state) => domain.global.set(state),
  });

  ctx.effect(() => ctx.connection.fetch.register({
    path: '/api/calorie-helper',
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: createClientRoute(tracker),
  }), 'calorie-helper: page data');
  registerTools(ctx, tracker);
}
