/** IndexedDB avoids localStorage's ~5 MB quota for projects containing model bytes. */
const DATABASE = "larp-projects-v2";
const STORE = "projects";
const KEY = "autosave";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB is unavailable")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open autosave database"));
    request.onblocked = () => reject(new Error("Autosave database is blocked by another tab"));
  });
}
export async function loadAutosave(): Promise<{text:string; updatedAt:number} | null> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly"), request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => { const value = request.result; resolve(typeof value === "string" ? {text:value,updatedAt:0} : value && typeof value.text === "string" && typeof value.updatedAt === "number" ? value : null); };
      request.onerror = () => reject(request.error || new Error("Autosave could not be read"));
    });
  } finally { db.close(); }
}
let queue: Promise<void> = Promise.resolve();
export function saveAutosave(text: string, updatedAt: number): Promise<void> {
  const save = async () => {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({text, updatedAt}, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Autosave failed"));
        tx.onabort = () => reject(tx.error || new Error("Autosave was aborted"));
      });
    } finally { db.close(); }
  };
  queue = queue.catch(() => {}).then(save);
  return queue;
}
