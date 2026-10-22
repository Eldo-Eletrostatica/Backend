import { Module } from '@nestjs/common';
import {
  DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS,
  IMAGE_CLEANUP_GRACE_PERIOD_MS,
  StorageService,
} from './storage.service';

@Module({
  providers: [
    StorageService,
    {
      provide: IMAGE_CLEANUP_GRACE_PERIOD_MS,
      useValue: DEFAULT_IMAGE_CLEANUP_GRACE_PERIOD_MS,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
