import { JSONFilePreset, type JSONFile } from 'lowdb/node';
import { join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { dbSchema, type DbData } from '../shared/zodSchemas';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

export async function createDb() {
  const defaultData: DbData = {
    clients: {},
    messages: [],
    sessions: [],
    tmDrivers: [],
    tmVehicles: [],
    tmRoutes: [],
    tmTrips: [],
    tmLegs: [],
    tmRouteAssignments: []
  };

  const db = await JSONFilePreset<DbData>(DB_FILE, defaultData);
  // Validate on load
  dbSchema.parse(db.data);
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;


