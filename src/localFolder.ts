/**
 * Local data folder via the File System Access API (Chrome/Edge).
 * The user picks a real folder on their disk once; the app then keeps a live
 * JSON copy of all its data there on every change. The directory handle is
 * persisted in IndexedDB (handles can't be stringified into localStorage).
 */

// The API isn't in TypeScript's DOM lib yet — minimal ambient declarations.
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemHandle {
    queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
}

export const BACKUP_FILENAME = 'typeblitz-data.json';

export type FolderStatus =
  | { state: 'unsupported' }
  | { state: 'none' }
  | { state: 'need-permission'; handle: FileSystemDirectoryHandle; name: string }
  | { state: 'active'; handle: FileSystemDirectoryHandle; name: string };

export function isFolderSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/* ---------- handle persistence (IndexedDB) ---------- */

const IDB_NAME = 'typeblitz-folder';
const IDB_STORE = 'handles';
const IDB_KEY = 'dataFolder';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value: FileSystemDirectoryHandle | null): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    if (value === null) tx.objectStore(IDB_STORE).delete(IDB_KEY);
    else tx.objectStore(IDB_STORE).put(value, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function forgetStoredHandle(): Promise<void> {
  try {
    await idbPut(null);
  } catch {
    // nothing to forget
  }
}

export async function loadStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIdb();
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle;
  } catch {
    return null;
  }
}

/* ---------- picking, permissions, writing ---------- */

/** Opens the browser's folder picker; resolves null if cancelled/denied. */
export async function pickDataFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await idbPut(handle);
    return handle;
  } catch {
    return null; // user cancelled the picker
  }
}

/** True if we may write; asks the user only when `ask` (needs a user gesture). */
export async function verifyPermission(handle: FileSystemDirectoryHandle, ask: boolean): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const };
  try {
    if ((await handle.queryPermission(descriptor)) === 'granted') return true;
    if (ask && (await handle.requestPermission(descriptor)) === 'granted') return true;
  } catch {
    // fall through
  }
  return false;
}

/** Writes the full app data snapshot into the folder. Never throws. */
export async function writeBackup(handle: FileSystemDirectoryHandle, payload: unknown): Promise<boolean> {
  try {
    const file = await handle.getFileHandle(BACKUP_FILENAME, { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
    return true;
  } catch {
    return false;
  }
}
