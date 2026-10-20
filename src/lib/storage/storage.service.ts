import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { AppConfig, type StorageConfig } from '../../config/app-config.js';
import { StorageUnavailableError } from './storage.errors.js';

const NOT_FOUND_STATUS = 404;

/** Name of an S3/network error, never its request or credentials. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

/** The one S3-compatible bucket (ADR-005). Every S3 failure becomes STORAGE_UNAVAILABLE. */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly settings: StorageConfig | null;
  private readonly client: S3Client | null;

  constructor(config: AppConfig) {
    this.settings = config.storage;
    this.client = this.settings
      ? new S3Client({
          endpoint: this.settings.endpoint,
          region: this.settings.region,
          forcePathStyle: this.settings.forcePathStyle,
          credentials: {
            accessKeyId: this.settings.accessKeyId,
            secretAccessKey: this.settings.secretAccessKey,
          },
        })
      : null;
  }

  onModuleDestroy(): void {
    this.client?.destroy();
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { client, bucket } = this.ready();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      throw new StorageUnavailableError(errorName(error));
    }
  }

  /** True when the object exists; false on 404; any other failure is STORAGE_UNAVAILABLE. */
  async exists(key: string): Promise<boolean> {
    const { client, bucket } = this.ready();
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (error) {
      if (
        error instanceof S3ServiceException &&
        error.$metadata.httpStatusCode === NOT_FOUND_STATUS
      ) {
        return false;
      }
      throw new StorageUnavailableError(errorName(error));
    }
  }

  publicUrl(key: string): string {
    return `${this.ready().publicBaseUrl}/${key}`;
  }

  private ready(): { client: S3Client; bucket: string; publicBaseUrl: string } {
    if (!this.client || !this.settings) {
      throw new StorageUnavailableError('NotConfigured');
    }
    return {
      client: this.client,
      bucket: this.settings.bucket,
      publicBaseUrl: this.settings.publicBaseUrl,
    };
  }
}
