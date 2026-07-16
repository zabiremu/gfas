export interface StorageService {
  save(relativePath: string, buffer: Buffer): Promise<string>;
  read(relativePath: string): Promise<Buffer>;
  exists(relativePath: string): Promise<boolean>;
}

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');
