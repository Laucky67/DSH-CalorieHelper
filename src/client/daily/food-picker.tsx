import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Food } from '../../core/contracts.ts';
import { basisText } from '../format.ts';
import { useDebounced, useLastData } from '../hooks.ts';
import { CloseIcon, PlusIcon, SearchIcon } from '../icons.tsx';
import { energyText } from '../presentation.ts';
import { useResource } from '../requests.ts';
import { searchFoods } from '../foods/data.ts';
import { Banner, IconButton } from '../ui.tsx';

type Props = {
  revision: number;
  onPick: (food: Food) => void;
  onCreate: (name: string) => void;
  /** 已有选择时可以收起搜索。 */
  onDismiss?: () => void;
};

const resultLimit = 30;

/** 搜索并选择食物，支持方向键与回车。 */
export function FoodPicker({ revision, onPick, onCreate, onDismiss }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const search = useDebounced(query.trim(), 180);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const load = useCallback(
    (signal: AbortSignal) => searchFoods(search, resultLimit, 0, signal),
    [search, revision],
  );
  const { data, error, refresh } = useResource(load);
  const foods = useLastData(data, 'picker');
  const settled = data !== undefined && search === query.trim();

  useEffect(() => { setActive(0); }, [search]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const count = foods?.length ?? 0;
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && count) { event.preventDefault(); setActive((value) => (value + 1) % count); }
    else if (event.key === 'ArrowUp' && count) { event.preventDefault(); setActive((value) => (value - 1 + count) % count); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      const food = foods?.[active];
      if (food) onPick(food);
    } else if (event.key === 'Escape' && onDismiss) { event.preventDefault(); onDismiss(); }
  };

  return <div className="cal-picker">
    <div className="cal-search is-inline">
      <SearchIcon size={16} />
      <input
        name="foodQuery" placeholder="搜索食物" aria-label="搜索食物" autoComplete="off" autoFocus
        role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={foods?.[active] ? `${listId}-${foods[active].id}` : undefined}
        value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onKeyDown}
      />
      {onDismiss && <IconButton label="收起搜索" icon={<CloseIcon size={14} />} onClick={onDismiss} />}
    </div>
    {error && !foods && <Banner onRetry={refresh}>{error}</Banner>}
    <ul className={`cal-options${data === undefined ? ' is-stale' : ''}`} id={listId} role="listbox" aria-label="食物" ref={listRef}>
      {foods?.map((food, index) => <li
        key={food.id} id={`${listId}-${food.id}`} role="option" aria-selected={index === active}
        data-food-id={food.id} data-food-name={food.name}
        className="cal-option" onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(food)}
      >
        <span className="cal-option-name">{food.name}</span>
        <span className="cal-option-meta">{basisText(food.nutrition.per)} · {energyText(food.nutrition.values.energyKcal)} 千卡</span>
      </li>)}
    </ul>
    <div className="cal-picker-foot">
      {settled && count === 0 && <span className="cal-muted">{query.trim() ? `没有「${query.trim()}」` : '食物库是空的'}</span>}
      <button type="button" className="cal-btn is-ghost is-small" onClick={() => onCreate(query.trim())}><PlusIcon size={14} />新增食物</button>
    </div>
  </div>;
}
