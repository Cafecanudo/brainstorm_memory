import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AttachmentRow } from '../../db/schema.js';
import { AppError, notFound, parse } from '../../shared/errors.js';
import { parseRangeHeader } from '../../shared/http-range.js';
import { idParamSchema } from '../../shared/schemas.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import type { IdeaRepository } from '../ideas/idea.repository.js';
import type { NoteRepository } from '../notes/note.repository.js';
import type { AttachmentOwner, AttachmentService } from './attachment.service.js';

const contentQuerySchema = z.object({ download: z.stringbool().optional() });

export interface AttachmentRoutesDeps {
  attachments: AttachmentService;
  ideas: IdeaRepository;
  notes: NoteRepository;
  storage: StorageProvider;
}

const toPublic = ({ storageKey: _storageKey, ...attachment }: AttachmentRow) => attachment;

export function attachmentRoutes({ attachments, ideas, notes, storage }: AttachmentRoutesDeps): FastifyPluginAsync {
  const receive = async (request: FastifyRequest, owner: AttachmentOwner) => {
    if (!request.isMultipart()) throw new AppError(415, 'Esperado multipart/form-data');
    const created: AttachmentRow[] = [];
    try {
      for await (const part of request.files()) {
        created.push(await attachments.store(owner, part));
      }
    } catch (error) {
      await Promise.allSettled(created.map((attachment) => attachments.remove(attachment.id)));
      throw error;
    }
    if (created.length === 0) throw new AppError(400, 'Nenhum arquivo enviado');
    return created.map(toPublic);
  };

  return async (app) => {
    app.post('/ideas/:id/attachments', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      if (!(await ideas.exists(id))) throw notFound('Ideia');
      const created = await receive(request, { kind: 'idea', id });
      await ideas.touch(id);
      return reply.code(201).send(created);
    });

    app.post('/notes/:id/attachments', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      if (!(await notes.exists(id))) throw new AppError(404, 'Anotação não encontrada');
      const created = await receive(request, { kind: 'note', id });
      await notes.touch(id);
      return reply.code(201).send(created);
    });

    app.get('/attachments/:id/content', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      const { download } = parse(contentQuerySchema, request.query);
      const attachment = await attachments.get(id);
      const stored = await storage.stat(attachment.storageKey);
      if (!stored) throw notFound('Arquivo do anexo');

      const size = stored.sizeBytes;
      const disposition = download ? 'attachment' : 'inline';
      reply
        .header('Accept-Ranges', 'bytes')
        .header('Content-Type', attachment.mimeType)
        .header('Cache-Control', 'private, max-age=31536000, immutable')
        .header('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`);

      const range = parseRangeHeader(request.headers.range, size);
      if (range.kind === 'invalid') {
        return reply.code(416).header('Content-Range', `bytes */${size}`).send();
      }
      if (range.kind === 'partial') {
        const { start, end } = range.range;
        return reply
          .code(206)
          .header('Content-Range', `bytes ${start}-${end}/${size}`)
          .header('Content-Length', end - start + 1)
          .send(storage.read(attachment.storageKey, range.range));
      }
      return reply.header('Content-Length', size).send(storage.read(attachment.storageKey));
    });

    app.delete('/attachments/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      const removed = await attachments.remove(id);
      if (removed.ideaId) await ideas.touch(removed.ideaId);
      if (removed.noteId) await notes.touch(removed.noteId);
      return reply.code(204).send();
    });
  };
}
