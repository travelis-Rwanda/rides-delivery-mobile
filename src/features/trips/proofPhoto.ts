import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import {
  makePhotoKey,
  validPhotoKey,
  type OpenedPhoto,
} from '../restaurant-workspace/photoAsset';

function photoDirectory() {
  return new Directory(Paths.document, 'delivery-proof-photos');
}

function photoFile(key: string) {
  if (!validPhotoKey.test(key)) throw new Error('Invalid photo reference.');
  return new File(photoDirectory(), key);
}

// Keeps the driver's photo on the device and returns the key to store.
export async function saveProofPhoto(asset: ImagePickerAsset): Promise<string> {
  const source = new File(asset.uri);
  const key = makePhotoKey(asset, source.size);
  photoDirectory().create({ idempotent: true, intermediates: true });
  await source.copy(photoFile(key));
  return key;
}

export async function openProofPhoto(
  key: string,
): Promise<OpenedPhoto | undefined> {
  const file = photoFile(key);
  return file.exists ? { uri: file.uri } : undefined;
}

export async function deleteProofPhoto(key: string) {
  const file = photoFile(key);
  if (file.exists) file.delete();
}