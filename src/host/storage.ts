import { createHash, randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { Context } from '@deepseek-ai/cordis';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { defineDomain } from '@deepseek-ai/dsh-storage-domain';
import { emptyLegacyState, legacyStateSchema } from '../storage/legacy-state.ts';
import { dataDirectory, databaseFilename, schemaVersion } from '../storage/layout.ts';
import { openSqlite } from '../storage/sqlite.ts';
import { TrackerError } from '../core/errors.ts';

const legacyDomain = defineDomain({
  name: 'calorie_helper', version: 1,
  global: { schema: legacyStateSchema, initial: emptyLegacyState }, tables: {},
});

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const errorCode = (error: unknown) => typeof error === 'object' && error !== null && 'code' in error ? error.code : 'UNKNOWN';
const upgradeError = (message: string) => new TrackerError(message, undefined, 'STORAGE_FAILURE');

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
  const base = `${destination}.${randomUUID()}`;
  const temporary = `${base}.copy`;
  const captured = `${base}.pending`;
  try {
    const bytes = await readIfPresent(source);
    if (!bytes) return;
    if (digest(bytes) !== importedDigest) {
      console.warn('calorie-helper: legacy data changed after migration; original retained', { source });
      return;
    }
    try {
      await writeFile(temporary, bytes, { flag: 'wx', mode: 0o600, flush: true });
      await link(temporary, destination).catch((error: unknown) => { if (errorCode(error) !== 'EEXIST') throw error; });
    } finally {
      await unlink(temporary).catch((error: unknown) => { if (errorCode(error) !== 'ENOENT') throw error; });
    }
    const backup = await readFile(destination);
    if (digest(backup) !== importedDigest) {
      console.warn('calorie-helper: existing legacy backup differs; original retained', { source });
      return;
    }
    // Capture whichever file was present at rename. An older process may replace the original path.
    await rename(source, captured);
    const snapshot = await readFile(captured);
    if (digest(snapshot) === importedDigest) await unlink(captured);
    else {
      try { await link(captured, source); await unlink(captured); }
      catch (error) { console.warn('calorie-helper: preserved a separate legacy snapshot', { captured, code: errorCode(error) }); }
      console.warn('calorie-helper: legacy data changed during migration; newer file retained', { source });
    }
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') console.warn('calorie-helper: legacy archive pending', errorCode(error));
  }
}

export async function openPluginStorage(ctx: Context, home = resolveDshHome()) {
  const storages = join(home, 'storages');
  const directory = dataDirectory(home);
  const source = join(storages, 'calorie_helper.json');
  const destination = join(directory, 'legacy-calorie_helper.json');
  const database = join(directory, databaseFilename);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if (await exists(destination) && !await exists(source) && !await exists(database)) {
    throw upgradeError('卡路里数据库缺失。请从数据库备份恢复。');
  }
  const store = openSqlite(database);
  try {
    if (store.needsInitialization()) {
      const bytes = await readIfPresent(source);
      let localState;
      if (bytes) {
        try { localState = parseLegacy(bytes); }
        catch { throw upgradeError('旧版卡路里数据格式有误。原文件已保留，请检查该文件后重试。'); }
      }
      const domain = await ctx.storageDomain.open(legacyDomain);
      try {
        const active = domain.global.get();
        const activeEmpty = isDeepStrictEqual(active, emptyLegacyState);
        if (!activeEmpty && localState && !isDeepStrictEqual(localState, emptyLegacyState) && !isDeepStrictEqual(localState, active)) {
          if (!store.needsInitialization()) return store;
          throw upgradeError('发现两份内容不同的旧版卡路里数据。请确认要升级的来源后重试。');
        }
        const state = activeEmpty ? localState ?? active : active;
        const sourceDigest = bytes && isDeepStrictEqual(localState, state) ? digest(bytes) : undefined;
        const archived = !bytes && isDeepStrictEqual(state, emptyLegacyState) && await readIfPresent(destination);
        if (archived && store.needsInitialization()) {
          throw upgradeError('卡路里数据库缺失。请从数据库备份恢复。');
        }
        const imported = await store.initialize({ state, sourceDigest });
        if (imported && (state.foods.length || state.entries.length || state.profiles.length)) console.info('calorie-helper: legacy data imported', {
          schemaVersion, foods: state.foods.length, entries: state.entries.length, profileVersions: state.profiles.length,
        });
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
