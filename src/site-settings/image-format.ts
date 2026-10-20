export interface ImageFormat {
  contentType: string;
  extension: string;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const UNSUPPORTED_IMAGE_MESSAGE = 'Formatos aceitos: PNG, JPEG e WebP.';

const PNG: ImageFormat = { contentType: 'image/png', extension: '.png' };
const JPEG: ImageFormat = { contentType: 'image/jpeg', extension: '.jpg' };
const WEBP: ImageFormat = { contentType: 'image/webp', extension: '.webp' };

// The name the upload gives a stored image: a random UUID and the extension of
// one of the formats above. Anything else in an image URL did not come from
// the upload.
const UPLOADED_IMAGE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

export function isUploadedImageName(name: string): boolean {
  return UPLOADED_IMAGE_NAME.test(name);
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
// WebP is a RIFF container: "RIFF", 4 bytes of size, then "WEBP".
const RIFF_SIGNATURE = Buffer.from('RIFF');
const WEBP_SIGNATURE = Buffer.from('WEBP');
const WEBP_SIGNATURE_OFFSET = 8;

// The format comes from the first bytes of the file, never from the name or the
// content type the client sends. SVG is left out on purpose: it can carry
// scripts that run when the bucket serves it.
export function detectImageFormat(content: Buffer): ImageFormat | null {
  if (startsWith(content, PNG_SIGNATURE)) {
    return PNG;
  }
  if (startsWith(content, JPEG_SIGNATURE)) {
    return JPEG;
  }
  if (
    startsWith(content, RIFF_SIGNATURE) &&
    startsWith(content.subarray(WEBP_SIGNATURE_OFFSET), WEBP_SIGNATURE)
  ) {
    return WEBP;
  }
  return null;
}

function startsWith(content: Buffer, signature: Buffer): boolean {
  return (
    content.length >= signature.length &&
    content.subarray(0, signature.length).equals(signature)
  );
}
