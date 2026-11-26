import { useCallback, useEffect, useState } from 'react';
import type { Food } from '../../core/contracts.ts';
import { useDebounced, useLastData } from '../hooks.ts';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, SearchIcon } from '../icons.tsx';
import { useResource } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { searchFoods } from './data.ts';
import type { FoodTarget } from './editor.tsx';
import { FoodList } from './food-list.tsx';

const pageSize = 50;

type Props = {
  revision: number;
  onOpenFood: (target: FoodTarget) => void;
};

export function FoodsPage({ revision, onOpenFood }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const search = useDebounced(query.trim(), 250);
  const load = useCallback(
    (signal: AbortSignal) => searchFoods(search, pageSize + 1, page * pageSize, signal),
    // revision 变化代表食物已被修改，需要重新读取。
    [search, page, revision],
  );
  const { data, error, refresh } = useResource(load, 4000);
  const result = useLastData(data, 'foods');
  const foods = result?.slice(0, pageSize);
  const hasMore = (result?.length ?? 0) > pageSize;

  useEffect(() => { setPage(0); }, [search]);
  useEffect(() => { if (data && data.length === 0 && page > 0) setPage((value) => value - 1); }, [data, page]);

  const open = (food: Food) => onOpenFood({ id: food.id, allowDelete: true });
  const create = (name?: string) => onOpenFood({ name });
  const turn = (step: number, from: HTMLElement) => {
    setPage((value) => Math.max(0, value + step));
    from.closest('.cal-scroll')?.scrollTo({ top: 0 });
  };

  return <div className="cal-foods">
    <div className="cal-toolbar">
      <label className="cal-search">
        <SearchIcon size={16} />
        <input
          type="search" name="foodSearch" placeholder="搜索食物" aria-label="搜索食物" autoComplete="off"
          value={query} onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="button" className="cal-btn is-primary" onClick={() => create()}><PlusIcon size={16} />新增食物</button>
    </div>

    {error && <Banner onRetry={refresh}>{error}</Banner>}

    {foods === undefined && !error && <div className="cal-skeleton-list" aria-busy="true">
      {[0, 1, 2, 3].map((index) => <div key={index} className="cal-skeleton" />)}
    </div>}

    {data !== undefined && data.length === 0 && (search
      ? <div className="cal-empty">
        <p>没有找到「{search}」</p>
        <button type="button" className="cal-btn" onClick={() => create(search)}><PlusIcon size={15} />新增「{search}」</button>
      </div>
      : page === 0 && <div className="cal-empty">
        <p>食物库还是空的</p>
        <button type="button" className="cal-btn" onClick={() => create()}><PlusIcon size={15} />新增食物</button>
      </div>)}

    {foods !== undefined && foods.length > 0 && <div className={data === undefined ? 'is-stale' : undefined}>
      <FoodList foods={foods} onOpen={open} />
    </div>}

    {(page > 0 || hasMore) && <nav className="cal-pager" aria-label="翻页">
      <button type="button" className="cal-btn is-quiet is-small" disabled={page === 0} onClick={(event) => turn(-1, event.currentTarget)}>
        <ChevronLeftIcon size={15} />上一页
      </button>
      <span className="cal-muted cal-num">第 {page + 1} 页</span>
      <button type="button" className="cal-btn is-quiet is-small" disabled={!hasMore} onClick={(event) => turn(1, event.currentTarget)}>
        下一页<ChevronRightIcon size={15} />
      </button>
    </nav>}
  </div>;
}
