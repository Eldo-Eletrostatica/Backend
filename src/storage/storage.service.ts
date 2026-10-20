import { randomUUID } from 'node:crypto';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

// The S3 API is the same on SeaweedFS (development) and Cloudflare R2
// (production); only the S3_* variables change (ADR 0006).
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  readonly publicUrl: string;

  constructor(config: ConfigService) {
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
}
