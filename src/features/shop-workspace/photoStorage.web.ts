import type { ImagePickerAsset } from 'expo-image-picker';

import { makePhotoKey, type OpenedPhoto } from './photoAsset';

const storeName = 'photos';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('rides-shop-preview-media', 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveShopPhoto(asset: ImagePickerAsset): Promise<string> {
  const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
  const key = makePhotoKey(asset, blob.size);
  await transaction('readwrite', (store) => store.add(blob, key));
  return key;
}

export async function openShopPhoto(
  key: string,
): Promise<OpenedPhoto | undefined> {
  const blob: unknown = await transaction('readonly', (store) =>
    store.get(key),
  );
  if (!(blob instanceof Blob)) return;
  const uri = URL.createObjectURL(blob);
  return { uri, release: () => URL.revokeObjectURL(uri) };
}

export async function deleteShopPhoto(key: string) {
  await transaction('readwrite', (store) => store.delete(key));
}
