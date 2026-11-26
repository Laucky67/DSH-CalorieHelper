import { openSqlite } from '../src/storage/sqlite.ts';

export async function memoryStorage() {
  const store = openSqlite(':memory:');
  await store.initialize();
  return store;
}
