import { FileToStore } from '../storage/storage.service';

export const MAX_QUOTE_PDF_BYTES = 10 * 1024 * 1024;
export const UNSUPPORTED_QUOTE_FILE_MESSAGE = 'Envie o projeto em PDF.';
export const QUOTE_PDFS_FOLDER = 'quotes';

const PDF_SIGNATURE = Buffer.from('%PDF-');

// The format comes from the first bytes of the file, never from the name or
// the content type the client sends.
export function isPdf(content: Buffer): boolean {
  return (
    content.length >= PDF_SIGNATURE.length &&
    content.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)
  );
}

export function toStoredPdf(content: Buffer): FileToStore {
  return { content, contentType: 'application/pdf', extension: '.pdf' };
}
