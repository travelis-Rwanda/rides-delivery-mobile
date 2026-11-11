import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

import { makePhotoKey, validPhotoKey, type OpenedPhoto } from './photoAsset';

function photoDirectory() {
  return new Directory(Paths.document, 'shop-preview-photos');
}

function photoFile(key: string) {
  if (!validPhotoKey.test(key)) throw new Error('Invalid photo reference.');
  return new File(photoDirectory(), key);
}

export async function saveShopPhoto(asset: ImagePickerAsset): Promise<string> {
  const source = new File(asset.uri);
  const key = makePhotoKey(asset, source.size);
  photoDirectory().create({ idempotent: true, intermediates: true });
  await source.copy(photoFile(key));
  return key;
}

export async function openShopPhoto(
  key: string,
): Promise<OpenedPhoto | undefined> {
  const file = photoFile(key);
  return file.exists ? { uri: file.uri } : undefined;
}

export async function deleteShopPhoto(key: string) {
  const file = photoFile(key);
  if (file.exists) file.delete();
}
