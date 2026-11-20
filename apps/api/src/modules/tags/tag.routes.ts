import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { parse } from '../../shared/errors.js';
import type { TagRepository } from './tag.repository.js';

const listQuerySchema = z.object({
  projectId: z.uuid().optional(),
  kind: z.enum(['idea', 'note']).optional(),
});

export function tagRoutes({ tags }: { tags: TagRepository }): FastifyPluginAsync {
  return async (app) => {
    app.get('/tags', async (request) => tags.list(parse(listQuerySchema, request.query)));
  };
}
