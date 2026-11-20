import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError, parse } from '../../shared/errors.js';
import { idParamSchema, searchSchema, tagFilterSchema, tagsSchema } from '../../shared/schemas.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import type { NoteDetail, NoteRepository } from './note.repository.js';

const noteBaseSchema = z.object({
  projectId: z.uuid().nullable(),
  title: z.string().trim().max(200),
  body: z.string().max(100_000),
  tags: tagsSchema,
  pinned: z.boolean(),
});

const createNoteSchema = noteBaseSchema.extend({
  projectId: noteBaseSchema.shape.projectId.default(null),
  title: noteBaseSchema.shape.title.default(''),
  body: noteBaseSchema.shape.body.default(''),
  tags: tagsSchema.default([]),
  pinned: noteBaseSchema.shape.pinned.default(false),
});

const updateNoteSchema = noteBaseSchema.partial();

const UNASSIGNED = 'none';

const listQuerySchema = z.object({
  projectId: z
    .union([z.uuid(), z.literal(UNASSIGNED)])
    .optional()
    .transform((value) => (value === UNASSIGNED ? null : value)),
  tag: tagFilterSchema.optional(),
  q: searchSchema.optional(),
});

const noteNotFound = () => new AppError(404, 'Anotação não encontrada');

const etagOf = (version: number) => `"${version}"`;

function expectedVersion(request: FastifyRequest): number | null {
  const header = request.headers['if-match'];
  if (!header) throw new AppError(428, 'Informe a versão da anotação no cabeçalho If-Match');
  const match = /^(?:W\/)?"(\d+)"$/.exec(header.trim());
  return match ? Number(match[1]) : null;
}

const sendNote = (reply: FastifyReply, note: NoteDetail, code = 200) =>
  reply.code(code).header('ETag', etagOf(note.version)).send(note);

export function noteRoutes({ notes, storage }: { notes: NoteRepository; storage: StorageProvider }): FastifyPluginAsync {
  return async (app) => {
    app.get('/notes', async (request) => notes.list(parse(listQuerySchema, request.query)));

    app.get('/notes/counts', async () => notes.counts());

    app.get('/notes/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      const note = await notes.findById(id);
      if (!note) throw noteNotFound();
      return sendNote(reply, note);
    });

    app.post('/notes', async (request, reply) => {
      const note = await notes.create(parse(createNoteSchema, request.body));
      return sendNote(reply.header('Location', `/api/notes/${note.id}`), note, 201);
    });

    app.patch('/notes/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      const input = parse(updateNoteSchema, request.body);
      const version = expectedVersion(request);
      const result = await notes.update(id, version ?? -1, input);
      if (result.status === 'not_found') throw noteNotFound();
      if (result.status === 'conflict') {
        throw new AppError(412, 'A anotação foi alterada em outro lugar', { current: result.current });
      }
      return sendNote(reply, result.note);
    });

    app.delete('/notes/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      if (!(await notes.delete(id))) throw noteNotFound();
      await storage
        .deletePrefix(id)
        .catch((err: unknown) => request.log.warn({ err }, 'failed to delete note media'));
      return reply.code(204).send();
    });
  };
}
