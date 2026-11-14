/**
 * Keeps the open files in IndexedDB, so edits survive a reload and nothing is lost before it is downloaded.
 * Everything stays in this browser. Failures (private windows, blocked storage) are ignored: the app works
 * without it, just without the memory.
 */

const DB_NAME = 'ecore-studio'
const STORE = 'workspace'
const RECORD = 'current'

export interface StoredFile {
  name: string
  text: string
  savedText: string | null
}

export interface StoredWorkspace {
  files: StoredFile[]
  links: [string, string][]
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available'))
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed to open'))
  })
}

let dbPromise: Promise<IDBDatabase> | null = null
const db = () => (dbPromise ??= openDb())

export async function loadWorkspace(): Promise<StoredWorkspace | null> {
  try {
    const database = await db()
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(RECORD)
      request.onsuccess = () => resolve((request.result as StoredWorkspace | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('read failed'))
    })
  } catch {
    return null
  }
}

export async function saveWorkspace(workspace: StoredWorkspace): Promise<void> {
  try {
    const database = await db()
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(workspace, RECORD)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('write failed'))
    })
  } catch {
    // Storage is a convenience; the open files are still in memory.
  }
}
