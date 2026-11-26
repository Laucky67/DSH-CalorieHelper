import { openSqlite } from '../src/storage/sqlite.ts';

export function memoryStorage() {
  const store = openSqlite(':memory:');
  store.initialize();
  return store;
}
