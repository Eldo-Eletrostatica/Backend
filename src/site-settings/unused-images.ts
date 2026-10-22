export interface StoredImage {
  key: string;
  uploadedAt: Date;
}

// An image is in use when the draft or the published settings point to its
// public URL. An image uploaded within the grace period is kept even unused:
// the editor may still be about to save its URL in the draft.
export function findUnusedImageKeys(
  storedImages: StoredImage[],
  usedUrls: (string | null)[],
  publicUrl: string,
  now: Date,
  gracePeriodMs: number,
): string[] {
  const usedKeys = new Set(
    usedUrls
      .filter((url): url is string => url?.startsWith(`${publicUrl}/`) ?? false)
      .map((url) => url.slice(publicUrl.length + 1)),
  );
  const oldestKeptUpload = now.getTime() - gracePeriodMs;
  return storedImages
    .filter(({ key }) => !usedKeys.has(key))
    .filter(({ uploadedAt }) => uploadedAt.getTime() <= oldestKeptUpload)
    .map(({ key }) => key);
}
