import { Module } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { MinioStorageService } from './minio-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

// STORAGE_DRIVER=local (default) keeps production on the existing local-disk
// behavior; set STORAGE_DRIVER=minio to opt into the MinIO-backed driver.
@Module({
  providers: [
    LocalStorageService,
    MinioStorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (local: LocalStorageService, minio: MinioStorageService) =>
        process.env.STORAGE_DRIVER === 'minio' ? minio : local,
      inject: [LocalStorageService, MinioStorageService],
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
