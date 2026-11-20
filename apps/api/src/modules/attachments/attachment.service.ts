import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import type { AttachmentKind, AttachmentRow } from '../../db/schema.js';
import { AppError, notFound } from '../../shared/errors.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import type { AttachmentRepository } from './attachment.repository.js';

const SUPPORTED_TYPES: Record<string, { kind: AttachmentKind; extension: string }> = {
  'image/png': { kind: 'image', extension: '.png' },
  'image/jpeg': { kind: 'image', extension: '.jpg' },
  'image/gif': { kind: 'image', extension: '.gif' },
  'image/webp': { kind: 'image', extension: '.webp' },
  'video/webm': { kind: 'video', extension: '.webm' },
  'video/mp4': { kind: 'video', extension: '.mp4' },
};

export interface IncomingFile {
  filename: string;
  mimetype: string;
  file: Readable & { truncated?: boolean };
}

export type AttachmentOwner = { kind: 'idea'; id: string } | { kind: 'note'; id: string };

export class AttachmentService {
  constructor(
    private readonly repository: AttachmentRepository,
    private readonly storage: StorageProvider,
  ) {}

  async store(owner: AttachmentOwner, incoming: IncomingFile): Promise<AttachmentRow> {
    const mimeType = incoming.mimetype.split(';')[0]!.trim().toLowerCase();
    const type = SUPPORTED_TYPES[mimeType];
    if (!type) {
      incoming.file.resume();
      throw new AppError(415, `Tipo de arquivo não suportado: ${mimeType}`, {
        supported: Object.keys(SUPPORTED_TYPES),
      });
    }

    const id = randomUUID();
    const storageKey = `${owner.id}/${id}${type.extension}`;
    const { sizeBytes } = await this.storage.save(storageKey, incoming.file);

    if (incoming.file.truncated) {
      await this.storage.delete(storageKey);
      throw new AppError(413, `Arquivo excede o limite: ${incoming.filename}`);
    }

    try {
      return await this.repository.create({
        id,
        ideaId: owner.kind === 'idea' ? owner.id : null,
        noteId: owner.kind === 'note' ? owner.id : null,
        kind: type.kind,
        mimeType,
        originalName: incoming.filename || `${id}${type.extension}`,
        sizeBytes,
        storageKey,
      });
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  async get(id: string): Promise<AttachmentRow> {
    const attachment = await this.repository.findById(id);
    if (!attachment) throw notFound('Anexo');
    return attachment;
  }

  async remove(id: string): Promise<AttachmentRow> {
    const attachment = await this.repository.delete(id);
    if (!attachment) throw notFound('Anexo');
    await this.storage.delete(attachment.storageKey);
    return attachment;
  }
}
