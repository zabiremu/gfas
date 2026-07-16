import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type { StorageService } from './storage.interface';

// Opt-in driver (STORAGE_DRIVER=minio) targeting the MinIO container already
// provisioned in docker-compose.yml, via the S3-compatible AWS SDK client.
@Injectable()
export class MinioStorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? 'amovix-documents';
    const host = process.env.MINIO_ENDPOINT ?? 'localhost';
    const port = process.env.MINIO_PORT ?? '9000';
    // MINIO_ENDPOINT is a bare host (matches existing .env convention);
    // build the full URL the S3 client expects.
    const endpoint = host.startsWith('http') ? host : `http://${host}:${port}`;
    this.client = new S3Client({
      endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin123',
      },
    });
  }

  async save(relativePath: string, buffer: Buffer): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: relativePath,
        Body: buffer,
        ContentType: 'application/pdf',
      }),
    );
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: relativePath }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: relativePath }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
