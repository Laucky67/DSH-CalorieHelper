import type { KeyboardEvent, ReactNode } from 'react';
import { BasketIcon, PersonIcon, PlateIcon, TrendIcon } from './icons.tsx';

export type Tab = 'daily' | 'trends' | 'foods' | 'profile';

const tabs: ReadonlyArray<{ id: Tab; label: string; icon: ReactNode }> = [
  { id: 'daily', label: '饮食记录', icon: <PlateIcon size={16} /> },
  { id: 'trends', label: '趋势', icon: <TrendIcon size={16} /> },
  { id: 'foods', label: '食物库', icon: <BasketIcon size={16} /> },
  { id: 'profile', label: '个人资料', icon: <PersonIcon size={16} /> },
];

/** 页面切换。 */
export function Tabs({ value, onChange }: { value: Tab; onChange: (tab: Tab) => void }) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const list = event.currentTarget;
    const index = tabs.findIndex((tab) => tab.id === value);
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.id);
    window.requestAnimationFrame(() => {
      list.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus();
    });
  };
  return <div className="cal-tabs" role="tablist" aria-label="页面" onKeyDown={onKeyDown}>
    {tabs.map((tab) => <button
      key={tab.id} type="button" role="tab" aria-selected={tab.id === value} tabIndex={tab.id === value ? 0 : -1}
      className={`cal-tab${tab.id === value ? ' is-on' : ''}`} onClick={() => onChange(tab.id)}
    >{tab.icon}<span>{tab.label}</span></button>)}
  </div>;
}
