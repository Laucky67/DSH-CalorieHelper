import { DatabaseSync } from 'node:sqlite';
import type { SQLOutputValue } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import type { DietEntry, Food, Profile, Quantity, ToolInput } from '../core/contracts.ts';
import { naturalFoodName, plainFoodName } from '../core/food-name.ts';
import { nutritionFor } from '../core/nutrition.ts';
import type { TrackerRepository } from '../core/repository.ts';
import { TrackerError } from '../core/errors.ts';
import { applicationId, schemaVersion } from './layout.ts';
import { createTables } from './schema.ts';
import type { LegacyState } from './legacy-state.ts';
import { isBusy } from './sqlite-errors.ts';

type Row = Record<string, SQLOutputValue>;
type LegacyImport = { state: LegacyState; sourceDigest?: string };

function decodeFood(row: Row): Food {
  const food: Food = {
    id: String(row.food_id ?? row.id), name: String(row.name), nutrition: JSON.parse(String(row.nutrition)),
  };
  if (row.portions !== null) food.portions = JSON.parse(String(row.portions));
  return food;
}

function decodeEntry(row: Row): DietEntry {
  return {
    id: String(row.id), date: String(row.date), meal: row.meal as DietEntry['meal'],
    foodId: String(row.food_id), amount: { value: Number(row.quantity), unit: String(row.unit) },
  };
}

export function openSqlite(path: string) {
  const database = new DatabaseSync(path, { timeout: 15, enableForeignKeyConstraints: true });
  let closed = false;
  try {
    const existing = version();
    const identity = database.prepare('PRAGMA application_id').get()?.application_id;
    if (existing !== 0 && existing !== schemaVersion) {
      throw new Error(`不支持该卡路里数据库版本（${existing}）。`);
    }
    if (identity !== applicationId && (existing !== 0 || identity !== 0)) {
      throw new TrackerError('无法使用当前卡路里数据库。请从可用的数据库备份恢复。', undefined, 'STORAGE_FAILURE');
    }
    database.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
  } catch (error) {
    database.close();
    throw error;
  }

  function version(): number {
    return Number(database.prepare('PRAGMA user_version').get()?.user_version);
  }

  function commit<Result>(run: () => Result): Result {
    try {
      const result = run();
      database.exec('COMMIT');
      return result;
    } catch (error) {
      if (database.isTransaction) database.exec('ROLLBACK');
      throw error;
    }
  }

  async function write<Result>(change: () => Result, signal?: AbortSignal): Promise<Result> {
    const deadline = performance.now() + 350;
    while (true) {
      if (closed || signal?.aborted) throw new TrackerError('操作已取消。', undefined, 'CANCELLED');
      try { database.exec('BEGIN IMMEDIATE'); break; }
      catch (error) {
        if (!isBusy(error) || performance.now() >= deadline) throw error;
        try { await delay(35, undefined, { signal }); }
        catch (interruption) {
          if (!signal?.aborted) throw interruption;
          throw new TrackerError('操作已取消。', undefined, 'CANCELLED');
        }
      }
    }
    return commit(change);
  }

  function foodValues(food: Food) {
    const plain = plainFoodName(food.name);
    return [food.name, plain, naturalFoodName(plain), JSON.stringify(food.nutrition), food.portions ? JSON.stringify(food.portions) : null] as const;
  }

  function entryValues(entry: DietEntry) {
    return [entry.date, entry.meal, entry.foodId, entry.amount.value, entry.amount.unit] as const;
  }

  function searchFoods(query: string | undefined, limit: number, offset: number): Food[] {
    if (!query) return database.prepare('SELECT * FROM foods ORDER BY rowid LIMIT ? OFFSET ?').all(limit, offset).map(decodeFood);
    const plain = plainFoodName(query);
    const natural = naturalFoodName(plain);
    const rows = database.prepare(`
      SELECT *, CASE WHEN name=? THEN 4 WHEN plain_name=? AND ?!='' THEN 3
        WHEN natural_name=? AND ?!='' THEN 2 ELSE 1 END AS relevance
      FROM foods WHERE name=? OR (?!='' AND instr(plain_name,?)>0) OR (?!='' AND instr(natural_name,?)>0)
      ORDER BY relevance DESC,rowid LIMIT ? OFFSET ?
    `).all(query, plain, plain, natural, natural, query, plain, plain, natural, natural, limit, offset);
    return rows.map(decodeFood);
  }

  function entries(query: ToolInput<'diet_query'>) {
    const selection = `SELECT e.*, f.name, f.nutrition, f.portions FROM diet_entries e JOIN foods f ON f.id=e.food_id`;
    const rows = 'id' in query ? database.prepare(`${selection} WHERE e.id=?`).all(query.id)
      : query.meal ? database.prepare(`${selection} WHERE e.date=? AND e.meal=? ORDER BY e.rowid`).all(query.date, query.meal)
      : database.prepare(`${selection} WHERE e.date=? ORDER BY e.rowid`).all(query.date);
    return rows.map((row) => ({ entry: decodeEntry(row), food: decodeFood(row) }));
  }

  const repo: TrackerRepository = {
    read(query) { database.exec('BEGIN'); return commit(query); },
    write,
    receipt(action, id) {
      const row = database.prepare('SELECT input,result,confirmation_id FROM operation_receipts WHERE action=? AND id=?').get(action, id);
      return row ? {
        input: String(row.input), result: String(row.result),
        confirmationId: typeof row.confirmation_id === 'string' ? row.confirmation_id : undefined,
      } : undefined;
    },
    pendingReceipt(action, input) {
      const row = database.prepare('SELECT id,result FROM operation_receipts WHERE action=? AND input=? AND pending=1').get(action, input);
      return row ? { id: String(row.id), result: String(row.result) } : undefined;
    },
    putReceipt(action, id, input, result, pending, confirmationId) {
      database.prepare('INSERT INTO operation_receipts VALUES(?,?,?,?,?,?)').run(action, id, input, result, Number(pending), confirmationId ?? null);
    },
    confirmReceipt(action, id) {
      database.prepare('UPDATE operation_receipts SET pending=0 WHERE action=? AND id=? AND pending=1').run(action, id);
    },
    searchFoods,
    food(id) {
      const row = database.prepare('SELECT * FROM foods WHERE id=?').get(id);
      return row ? decodeFood(row) : undefined;
    },
    foodNamed(name) {
      const row = database.prepare('SELECT * FROM foods WHERE name=?').get(name);
      return row ? decodeFood(row) : undefined;
    },
    insertFood(food) { database.prepare('INSERT INTO foods VALUES(?,?,?,?,?,?)').run(food.id, ...foodValues(food)); },
    updateFood(food) {
      database.prepare('UPDATE foods SET name=?,plain_name=?,natural_name=?,nutrition=?,portions=? WHERE id=?').run(...foodValues(food), food.id);
    },
    deleteFood(id) { database.prepare('DELETE FROM foods WHERE id=?').run(id); },
    foodInUse(id) { return Boolean(database.prepare('SELECT 1 FROM diet_entries WHERE food_id=? LIMIT 1').get(id)); },
    amountsForFood(id): Quantity[] {
      return database.prepare('SELECT DISTINCT quantity,unit FROM diet_entries WHERE food_id=?').all(id)
        .map((row) => ({ value: Number(row.quantity), unit: String(row.unit) }));
    },
    entry(id) {
      const row = database.prepare('SELECT * FROM diet_entries WHERE id=?').get(id);
      return row ? decodeEntry(row) : undefined;
    },
    entries,
    insertEntry(entry) { database.prepare('INSERT INTO diet_entries VALUES(?,?,?,?,?,?)').run(entry.id, ...entryValues(entry)); },
    updateEntry(entry) {
      database.prepare('UPDATE diet_entries SET date=?,meal=?,food_id=?,quantity=?,unit=? WHERE id=?').run(...entryValues(entry), entry.id);
    },
    deleteEntry(id) { database.prepare('DELETE FROM diet_entries WHERE id=?').run(id); },
    profileOn(date) {
      const row = database.prepare('SELECT version,profile FROM profile_versions WHERE effective_date<=? ORDER BY effective_date DESC,version DESC LIMIT 1').get(date);
      return row ? { version: Number(row.version), profile: JSON.parse(String(row.profile)) as Profile } : undefined;
    },
    appendProfile(date, profile) {
      return Number(database.prepare('INSERT INTO profile_versions(effective_date,profile) VALUES(?,?)').run(date, JSON.stringify(profile)).lastInsertRowid);
    },
  };

  return {
    ...repo,
    needsInitialization: () => version() === 0,
    async initialize(legacy?: LegacyImport) {
      if (version() === schemaVersion) return false;
      return repo.write(() => {
        if (version() === schemaVersion) return false;
        database.exec(createTables);
        if (legacy) {
          for (const food of legacy.state.foods) repo.insertFood(food);
          for (const entry of legacy.state.entries) {
            const food = repo.food(entry.foodId);
            if (!food) throw new Error('旧数据中有饮食记录引用了不存在的食物。');
            nutritionFor(food, entry.amount);
            repo.insertEntry(entry);
          }
          for (const version of legacy.state.profiles) repo.appendProfile(version.effectiveDate, version.profile);
          if (legacy.sourceDigest) database.prepare('INSERT INTO storage_metadata VALUES(?,?)').run('legacy_digest', legacy.sourceDigest);
        }
        database.exec(`PRAGMA application_id=${applicationId}; PRAGMA user_version=${schemaVersion};`);
        return true;
      });
    },
    legacyDigest() {
      const row = database.prepare('SELECT value FROM storage_metadata WHERE key=?').get('legacy_digest');
      return typeof row?.value === 'string' ? row.value : undefined;
    },
    close() {
      if (closed) return;
      database.close();
      closed = true;
    },
  };
}
