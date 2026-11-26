export function sqliteErrorCode(error: unknown): number | undefined {
  return error && typeof error === 'object' && 'errcode' in error && typeof error.errcode === 'number'
    ? error.errcode & 255 : undefined;
}

export function isBusy(error: unknown): boolean {
  const code = sqliteErrorCode(error);
  return code === 5 || code === 6;
}
