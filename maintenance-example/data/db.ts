import { LowSync } from 'lowdb'
import { LocalStorage } from 'lowdb/browser'
import type { AppContext } from '../state/appMachine'

type Schema = {
  context: AppContext | null
}

const STORAGE_KEY = 'lowdb.flow-client'

let dbInstance: LowSync<Schema> | null = null

function getDbSync(): LowSync<Schema> {
  if (!dbInstance) {
    const adapter = new LocalStorage<Schema>(STORAGE_KEY)
    dbInstance = new LowSync<Schema>(adapter, { context: null })
    dbInstance.read()
    if (!dbInstance.data) dbInstance.data = { context: null }
  }
  return dbInstance
}

export function readContext(): AppContext | null {
  const db = getDbSync()
  db.read()
  return db.data?.context ?? null
}

export function writeContext(context: AppContext): void {
  const db = getDbSync()
  db.data = { context }
  db.write()
}


