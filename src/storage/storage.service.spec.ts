import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

const PUBLIC_URL = 'http://localhost:8333/eldo';
const UPLOADED_NAME = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b.png';

describe('StorageService.isUploadedImageUrl', () => {
  const config = {
    getOrThrow: (key: string) =>
      key === 'S3_PUBLIC_URL' ? PUBLIC_URL : 'unused',
  } as unknown as ConfigService;
  const storageService = new StorageService(config, 0);

  it.each([
    [`${PUBLIC_URL}/showcase/${UPLOADED_NAME}`, 'showcase', true],
    [`${PUBLIC_URL}/visual/${UPLOADED_NAME}`, 'visual', true],
    [`${PUBLIC_URL}/visual/${UPLOADED_NAME}`, 'showcase', false],
    [`${PUBLIC_URL}/showcase/capa.png`, 'showcase', false],
    [`https://exemplo.com/showcase/${UPLOADED_NAME}`, 'showcase', false],
  ])('%s na pasta %s: %s', (url, folder, expected) => {
    expect(storageService.isUploadedImageUrl(url, folder)).toBe(expected);
  });
});
