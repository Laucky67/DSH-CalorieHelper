#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { access, link, mkdir, mkdtemp, readdir, rmdir, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';

const [command, file, extra] = process.argv.slice(2);
const directory = join(resolveDshHome(), 'storages', 'calorie-helper');
const database = join(directory, 'calorie.sqlite');

function openBackupSource(path) {
  const source = new DatabaseSync(path, { readOnly: true, timeout: 2000 });
  try {
    const version = source.prepare('PRAGMA user_version').get().user_version;
    const tables = source.prepare(`SELECT count(*) AS total FROM sqlite_schema WHERE type='table'
      AND name IN ('foods','diet_entries','profile_versions','operation_receipts','storage_metadata')`).get().total;
    if (version !== 1 || tables !== 5 || source.prepare('PRAGMA quick_check').get().quick_check !== 'ok' ||
        source.prepare('PRAGMA foreign_key_check').get()) {
      throw new Error('文件不是可用的卡路里记录 SQLite 数据库。');
    }
    return source;
  } catch (error) {
    source.close();
    throw error;
  }
}

async function publishSnapshot(source, destination, folder) {
  const temporary = await mkdtemp(join(folder, '.snapshot-'));
  const path = join(temporary, 'backup.sqlite');
  try {
    await backup(source, path);
    const copy = new DatabaseSync(path);
    try { copy.exec('PRAGMA journal_mode=DELETE'); }
    finally { copy.close(); }
    await link(path, destination);
  } finally {
    for (const file of await readdir(temporary)) await unlink(join(temporary, file));
    await rmdir(temporary);
  }
}

try {
  if (command === 'backup' && !file) {
    const source = openBackupSource(database);
    try {
      const backups = join(directory, 'backups');
      await mkdir(backups, { recursive: true, mode: 0o700 });
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const destination = join(backups, `calorie-${timestamp}-${randomUUID()}.sqlite`);
      await publishSnapshot(source, destination, backups);
      console.log(destination);
    } finally { source.close(); }
  } else if (command === 'restore' && file && !extra) {
    const path = resolve(file);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    for (const filename of [database, `${database}-wal`, `${database}-shm`]) {
      const present = await access(filename).then(() => true, (error) => {
        if (error.code === 'ENOENT') return false;
        throw error;
      });
      if (present) throw new Error('目标已有卡路里数据库。请停止目标 DSH，使用空的 DSH_HOME 恢复，或将现有数据库及其伴随文件一并另存。');
    }
    const source = openBackupSource(path);
    try {
      // The published backup is a single file. An active WAL database needs to be backed up first.
      if (source.prepare('PRAGMA journal_mode').get().journal_mode === 'wal') {
        throw new Error('请先用 backup 命令生成单文件备份，再执行恢复。');
      }
      await publishSnapshot(source, database, directory);
      console.log(database);
    } finally { source.close(); }
  } else {
    throw new Error('用法：calorie-helper-data backup 或 calorie-helper-data restore <备份.sqlite>');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
