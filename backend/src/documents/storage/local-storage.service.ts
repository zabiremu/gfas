import { Injectable } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import type { StorageService } from './storage.interface';

// Default driver: files land under `<cwd>/uploads/...`, same layout as
// before this abstraction existed.
@Injectable()
export class LocalStorageService implements StorageService {
  async save(relativePath: string, buffer: Buffer): Promise<string> {
    const absolutePath = join(process.cwd(), relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, buffer);
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    return readFileSync(join(process.cwd(), relativePath));
  }

  async exists(relativePath: string): Promise<boolean> {
    return existsSync(join(process.cwd(), relativePath));
  }
}
