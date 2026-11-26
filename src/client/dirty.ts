import { useEffect } from 'react';

export function confirmDiscard(dirty: boolean): boolean {
  return !dirty || window.confirm('放弃未保存的修改？');
}

/** 把编辑中的未保存状态上报给外层，卸载时自动清除。 */
export function useReportDirty(dirty: boolean, report?: (dirty: boolean) => void): void {
  useEffect(() => { report?.(dirty); }, [dirty, report]);
  useEffect(() => () => report?.(false), [report]);
}
