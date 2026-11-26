import { useCallback, useEffect, useRef, useState } from 'react';
import { localDate } from '../../core/calendar.ts';
import type { DailySummary } from '../../core/contracts.ts';
import { useLastData } from '../hooks.ts';
import { useResource } from '../requests.ts';
import { loadSummary } from './data.ts';

/**
 * 当前查看的日期。查看今天且允许跟随时，跨过零点会自动换到新的一天；
 * 用户切到别的日期后不再跟随，回到今天后恢复。
 */
export function useFollowedDate(canFollow: boolean) {
  const [date, setDateState] = useState(localDate);
  const following = useRef(true);
  const allowed = useRef(canFollow);
  allowed.current = canFollow;

  const check = useCallback(() => {
    if (!following.current || !allowed.current) return;
    const today = localDate();
    setDateState((current) => current === today ? current : today);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(check, 30_000);
    const visible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [check]);

  useEffect(() => { if (canFollow) check(); }, [canFollow, check]);

  const setDate = useCallback((next: string) => {
    following.current = next === localDate();
    setDateState(next);
  }, []);
  return [date, setDate] as const;
}

/** 读取某天的汇总，每 4 秒刷新；切换日期前保留同一天的旧数据。 */
export function useDailySummary(date: string, revision: number) {
  const load = useCallback(
    (signal: AbortSignal) => loadSummary(date, signal),
    // revision 变化表示食物或个人资料已更新，需要重新计算。
    [date, revision],
  );
  const { data, error, refresh } = useResource<DailySummary>(load, 4000);
  const summary = useLastData(data, date);
  return { summary, fresh: data, error, refresh };
}
