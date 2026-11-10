import type { ImagePickerAsset } from 'expo-image-picker';

const extensions: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const maxPhotoBytes = 10 * 1024 * 1024;
export const validPhotoKey = /^[a-z0-9]+-[a-z0-9]+\.(jpg|png|webp)$/;

export function makePhotoKey(asset: ImagePickerAsset, size: number) {
  if (size <= 0 || size > maxPhotoBytes)
    throw new Error('Choose a photo smaller than 10 MB.');
  const mime = asset.file?.type || asset.mimeType;
  const extension = mime ? extensions[mime.toLowerCase()] : undefined;
  const suffix =
    extension ??
    (!mime
      ? /\.(jpe?g|png|webp)$/i
          .exec(asset.fileName ?? asset.uri)?.[1]
          .toLowerCase()
      : undefined);
  if (!suffix) throw new Error('Choose a JPG, PNG, or WebP photo.');
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${suffix === 'jpeg' ? 'jpg' : suffix}`;
}

export type OpenedPhoto = { uri: string; release?: () => void };
