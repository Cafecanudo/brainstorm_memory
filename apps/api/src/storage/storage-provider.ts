import type { Readable } from 'node:stream';
import type { ByteRange } from '../shared/http-range.js';

export interface StoredObject {
  sizeBytes: number;
}

export interface StorageProvider {
  save(key: string, source: Readable): Promise<StoredObject>;
  stat(key: string): Promise<StoredObject | null>;
  read(key: string, range?: ByteRange): Readable;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
