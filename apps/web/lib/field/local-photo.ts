import { openDB } from 'idb';

const DB_NAME = 'rockhound-field-photos';
const STORE = 'photos';

/**
 * Holds a Quick Log image on this device.
 * The stored blob is a candidate observation. It is not a confirmed identification
 * and it is not a provenance event.
 */
export async function saveLocalFieldPhoto(file: Blob): Promise<string> {
  const id = crypto.randomUUID();
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    },
  });
  await db.put(STORE, file, id);
  return id;
}
