import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { notFound, parse } from '../../shared/errors.js';
import { idParamSchema } from '../../shared/schemas.js';
import type { StorageProvider } from '../../storage/storage-provider.js';
import type { ProjectRepository } from './project.repository.js';

const projectBaseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const createProjectSchema = projectBaseSchema.extend({
  color: projectBaseSchema.shape.color.default('#6366f1'),
});

const updateProjectSchema = projectBaseSchema.partial();

export interface ProjectRoutesDeps {
  projects: ProjectRepository;
  storage: StorageProvider;
}

export function projectRoutes({ projects, storage }: ProjectRoutesDeps): FastifyPluginAsync {
  return async (app) => {
    app.get('/', async () => projects.list());

    app.post('/', async (request, reply) => {
      const input = parse(createProjectSchema, request.body);
      return reply.code(201).send(await projects.create(input));
    });

    app.patch('/:id', async (request) => {
      const { id } = parse(idParamSchema, request.params);
      const input = parse(updateProjectSchema, request.body);
      const project = await projects.update(id, input);
      if (!project) throw notFound('Projeto');
      return project;
    });

    app.delete('/:id', async (request, reply) => {
      const { id } = parse(idParamSchema, request.params);
      const ideaIds = await projects.delete(id);
      if (!ideaIds) throw notFound('Projeto');
      const results = await Promise.allSettled(ideaIds.map((ideaId) => storage.deletePrefix(ideaId)));
      results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .forEach((result) => request.log.warn({ err: result.reason }, 'failed to delete idea media'));
      return reply.code(204).send();
    });
  };
}
