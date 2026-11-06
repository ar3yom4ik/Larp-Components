export interface ExportHandle {
  name: string;
  createWritable: () => Promise<{ write: (data: string | Blob) => Promise<void>; close: () => Promise<void> }>;
  queryPermission?: (descriptor: { mode: string }) => Promise<string>;
  requestPermission?: (descriptor: { mode: string }) => Promise<string>;
}
const DB = 'larp-files', STORE = 'handles', KEY = 'current-project';
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function storeExportHandle(handle: ExportHandle) {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, KEY);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* IndexedDB is optional; handle stays in memory. */ }
}
export async function loadExportHandle(): Promise<ExportHandle | null> {
  try {
    const db = await open();
    const value = await new Promise<ExportHandle | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve((request.result as ExportHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  } catch { return null; }
}
export async function permission(handle: ExportHandle, request: boolean) {
  if (!handle.queryPermission) return true;
  let state = await handle.queryPermission({ mode: 'readwrite' });
  if (state !== 'granted' && request && handle.requestPermission) state = await handle.requestPermission({ mode: 'readwrite' });
  return state === 'granted';
}
export function canPickFile() { return typeof window !== 'undefined' && typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'; }
export async function clearExportHandle() {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* IndexedDB is optional. */ }
}
