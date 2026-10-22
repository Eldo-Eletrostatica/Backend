import { randomUUID } from 'node:crypto';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUploadedImageName } from './image-format';
import { findUnusedImageKeys } from './unused-images';

export interface FileToStore {
  content: Buffer;
  contentType: string;
  // With the leading dot, such as ".png".
  extension: string;
}

export interface StoredFile {
  key: string;
  url: string;
}

export interface ListedFile {
  key: string;
  uploadedAt: Date;
}

// The S3 API deletes at most 1000 objects per request.
const MAX_KEYS_PER_DELETE = 1000;

// How long an unused upload survives a cleanup, in case its URL is still on
// the way to the record that uses it. A provider, so the integration tests can
// set it to 0.
export const IMAGE_CLEANUP_GRACE_PERIOD_MS = 'IMAGE_CLEANUP_GRACE_PERIOD_MS';
export const DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS = 60 * 60 * 1000;

// The S3 API is the same on SeaweedFS (development) and Cloudflare R2
// (production); only the S3_* variables change (ADR 0006).
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  readonly publicUrl: string;

  constructor(
    config: ConfigService,
    @Inject(IMAGE_CLEANUP_GRACE_PERIOD_MS)
    private readonly imageCleanupGracePeriodMs: number,
  ) {
    this.bucket = config.getOrThrow<string>('S3_BUCKET');
    this.publicUrl = config.getOrThrow<string>('S3_PUBLIC_URL');
    this.client = new S3Client({
      endpoint: config.getOrThrow<string>('S3_ENDPOINT'),
      region: config.getOrThrow<string>('S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
      // SeaweedFS only serves bucket/key paths; R2 accepts them too.
      forcePathStyle: true,
    });
  }

  // A random name keeps uploads from overwriting each other and from being
  // guessed before the settings that use them are published.
  async upload(file: FileToStore, folder: string): Promise<StoredFile> {
    const key = `${folder}/${randomUUID()}${file.extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.content,
        ContentType: file.contentType,
      }),
    );
    return { key, url: `${this.publicUrl}/${key}` };
  }

  async listFiles(folder: string): Promise<ListedFile[]> {
    const files: ListedFile[] = [];
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${folder}/`,
          ContinuationToken: continuationToken,
        }),
      );
      for (const { Key, LastModified } of page.Contents ?? []) {
        if (Key !== undefined && LastModified !== undefined) {
          files.push({ key: Key, uploadedAt: LastModified });
        }
      }
      continuationToken = page.NextContinuationToken;
    } while (continuationToken !== undefined);
    return files;
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (let start = 0; start < keys.length; start += MAX_KEYS_PER_DELETE) {
      const batch = keys.slice(start, start + MAX_KEYS_PER_DELETE);
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })) },
        }),
      );
    }
  }

  // Features accept only images sent through their upload route, so the
  // cleanup below knows every image in the folder that is in use.
  isUploadedImageUrl(url: string, folder: string): boolean {
    const folderUrl = `${this.publicUrl}/${folder}/`;
    return (
      url.startsWith(folderUrl) &&
      isUploadedImageName(url.slice(folderUrl.length))
    );
  }

  // Deletes the images of the folder that no record points to anymore.
  async deleteUnusedImages(
    folder: string,
    usedUrls: (string | null)[],
  ): Promise<void> {
    const unusedKeys = findUnusedImageKeys(
      await this.listFiles(folder),
      usedUrls,
      this.publicUrl,
      new Date(),
      this.imageCleanupGracePeriodMs,
    );
    await this.deleteMany(unusedKeys);
  }
}
