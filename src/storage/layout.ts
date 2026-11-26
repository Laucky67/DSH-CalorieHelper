import { join } from 'node:path';

export const schemaVersion = 1;
export const applicationId = 0x43414c48; // CALH
export const databaseFilename = 'calorie.sqlite';
export const dataDirectory = (home: string) => join(home, 'storages', 'calorie-helper');
