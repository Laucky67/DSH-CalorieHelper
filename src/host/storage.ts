import { createHash } from 'node:crypto';
import { link, mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Context } from '@deepseek-ai/cordis';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { emptyLegacyState, legacyStateSchema } from '../storage/legacy-state.ts';
import { openSqlite } from '../storage/sqlite.ts';

const legacyDomain = defineDomain({
  name: 'calorie_helper', version: 1,
  global: { schema: legacyStateSchema, initial: emptyLegacyState }, tables: {},
});

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const errorCode = (error: unknown) => typeof error === 'object' && error !== null && 'code' in error ? error.code : 'UNKNOWN';

async function readIfPresent(path: string): Promise<Buffer | undefined> {
  try { return await readFile(path); }
  catch (error) {
    if (errorCode(error) === 'ENOENT') return undefined;
    throw error;
  }
}

async function exists(path: string): Promise<boolean> {
  try { await stat(path); return true; }
  catch (error) { if (errorCode(error) === 'ENOENT') return false; throw error; }
}

function parseLegacy(bytes: Buffer) {
  const raw = JSON.parse(bytes.toString('utf8'));
  if (raw?.unit?.name !== legacyDomain.name || raw.unit.version !== legacyDomain.version) {
    throw new Error('无法识别卡路里记录的旧数据文件。');
  }
  return legacyStateSchema.parse(raw.global);
}

async function archiveLegacy(source: string, destination: string, importedDigest: string) {
  try {
    const bytes = await readIfPresent(source);
    if (!bytes || digest(bytes) !== importedDigest) return;
    await link(source, destination).catch((error: unknown) => {
      if (errorCode(error) !== 'EEXIST') throw error;
    });
    const backup = await readIfPresent(destination);
    const current = await readIfPresent(source);
    if (backup && current && digest(backup) === importedDigest && digest(current) === importedDigest) await unlink(source);
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') console.warn('calorie-helper: legacy archive pending', errorCode(error));
  }
}

export async function openPluginStorage(ctx: Context, home = resolveDshHome()) {
  const storages = join(home, 'storages');
  const directory = join(storages, 'calorie-helper');
  const source = join(storages, 'calorie_helper.json');
  const destination = join(directory, 'legacy-calorie_helper.json');
  const database = join(directory, 'calorie.sqlite');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (await exists(destination) && !await exists(source) && !await exists(database)) {
    throw new Error('找到了旧版卡路里备份，但 SQLite 数据库缺失。请恢复已有的 SQLite 备份。');
  }
  const store = openSqlite(database);
  try {
    if (store.needsInitialization()) {
      const domain = await ctx.storageDomain.open(legacyDomain);
      try {
        const state = domain.global.get();
        const bytes = await readIfPresent(source);
        let sourceDigest: string | undefined;
        if (bytes) {
          try {
            if (isDeepStrictEqual(parseLegacy(bytes), state)) sourceDigest = digest(bytes);
          } catch { /* The active legacy backend can differ from the default path. */ }
        }
        const archived = !bytes && isDeepStrictEqual(state, emptyLegacyState) && await readIfPresent(destination);
        if (archived && store.needsInitialization()) {
          throw new Error('找到了旧版卡路里备份，但 SQLite 数据库缺失。请恢复已有的 SQLite 备份。');
        }
        store.initialize({ state, sourceDigest });
      } finally { await domain.close(); }
    }
    const archived = store.legacyDigest();
    if (archived) await archiveLegacy(source, destination, archived);
    return store;
  } catch (error) {
    store.close();
    throw error;
  }
}
