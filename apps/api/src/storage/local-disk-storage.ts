import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ByteRange } from '../shared/http-range.js';
import type { StorageProvider, StoredObject } from './storage-provider.js';

export class LocalDiskStorage implements StorageProvider {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
  }

  async init(): Promise<void> {
    await mkdir(this.root, { recursive: true });
  }

  async save(key: string, source: Readable): Promise<StoredObject> {
    const target = this.resolveKey(key);
    const temp = `${target}.${randomUUID()}.part`;
    await mkdir(dirname(target), { recursive: true });
    try {
      await pipeline(source, createWriteStream(temp, { flags: 'wx' }));
      await rename(temp, target);
    } catch (error) {
      await unlink(temp).catch(() => undefined);
      throw error;
    }
    const info = await stat(target);
    return { sizeBytes: info.size };
  }

  async stat(key: string): Promise<StoredObject | null> {
    try {
      const info = await stat(this.resolveKey(key));
      return info.isFile() ? { sizeBytes: info.size } : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  read(key: string, range?: ByteRange): Readable {
    return createReadStream(this.resolveKey(key), range ? { start: range.start, end: range.end } : undefined);
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const target = this.resolveKey(prefix);
    if (target === this.root) throw new Error('Refusing to delete storage root');
    await rm(target, { recursive: true, force: true });
  }

  private resolveKey(key: string): string {
    const full = resolve(this.root, key);
    if (full !== this.root && !full.startsWith(this.root + sep)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return full;
  }
}
