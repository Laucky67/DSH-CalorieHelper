import type { Context } from '@deepseek-ai/cordis';
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { CalorieApp } from './app.tsx';
import { FlameIcon } from './icons.tsx';

const panelId = 'calorie-helper' as MainPanelId;
export const inject = ['slots'];

export function apply(ctx: Context): void {
  ctx.slots.inject('main', () => ctx.slots.register(
    { name: 'main', key: panelId, inject: () => ({}) }, CalorieApp,
  ));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
    { name: 'sidebar.panellist', id: panelId, label: '卡路里记录' },
    () => <FlameIcon size={16} />,
  ));
}
