import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ideaPriority, ideaStatus } from '../../db/schema.js';
import { notFound, parse } from '../../shared/errors.js';
import { idParamSchema, searchSchema, tagFilterSchema, tagsSchema } from '../../shared/schemas.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import type { IdeaRepository } from './idea.repository.js';

const statusSchema = z.enum(ideaStatus.enumValues);
const prioritySchema = z.enum(ideaPriority.enumValues);

const ideaBaseSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(100_000),
  status: statusSchema,
  priority: prioritySchema,
  tags: tagsSchema,
});

const createIdeaSchema = ideaBaseSchema.extend({
  description: ideaBaseSchema.shape.description.default(''),
  status: statusSchema.default('backlog'),
  priority: prioritySchema.default('medium'),
  tags: tagsSchema.default([]),
});

const updateIdeaSchema = ideaBaseSchema.partial();

const listQuerySchema = z.object({
  projectId: z.uuid().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  tag: tagFilterSchema.optional(),
  q: searchSchema.optional(),
});

export interface IdeaRoutesDeps {
  ideas: IdeaRepository;
  storage: StorageProvider;
}

export function ideaRoutes({ ideas, storage }: IdeaRoutesDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/ideas', async (request) => ideas.list(parse(listQuerySchema, request.query)));

    app.get('/ideas/:id', async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const idea = await ideas.findById(id);
      if (!idea) throw notFound('Ideia');
      return idea;
    });

    app.post('/ideas', async (request, reply) => {
      const input = parse(createIdeaSchema, request.body);
      return reply.code(201).send(await ideas.create(input));
    });

    app.patch('/ideas/:id', async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const input = parse(updateIdeaSchema, request.body);
      const idea = await ideas.update(id, input);
      if (!idea) throw notFound('Ideia');
      return idea;
    });

    app.delete('/ideas/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      if (!(await ideas.delete(id))) throw notFound('Ideia');
      await storage
        .deletePrefix(id)
        .catch((err: unknown) => request.log.warn({ err }, 'failed to delete idea media'));
      return reply.code(204).send();
    });
  };
}
