import { useEffect, useRef, useState } from 'react';

export function useDebounced<Value>(value: Value, delay: number): Value {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** 重新加载期间保留上一次的数据，避免界面闪烁；scope 变化时不沿用。 */
export function useLastData<Data>(data: Data | undefined, scope: string): Data | undefined {
  const last = useRef<{ scope: string; data: Data } | undefined>(undefined);
  if (data !== undefined) last.current = { scope, data };
  return data ?? (last.current?.scope === scope ? last.current.data : undefined);
}
