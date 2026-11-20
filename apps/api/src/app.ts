import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import type { Env } from './config/env.js';
import type { Database } from './db/client.js';
import { AttachmentRepository } from './modules/attachments/attachment.repository.js';
import { attachmentRoutes } from './modules/attachments/attachment.routes.js';
import { AttachmentService } from './modules/attachments/attachment.service.js';
import { IdeaRepository } from './modules/ideas/idea.repository.js';
import { ideaRoutes } from './modules/ideas/idea.routes.js';
import { NoteRepository } from './modules/notes/note.repository.js';
import { noteRoutes } from './modules/notes/note.routes.js';
import { ProjectRepository } from './modules/projects/project.repository.js';
import { projectRoutes } from './modules/projects/project.routes.js';
import { TagRepository } from './modules/tags/tag.repository.js';
import { tagRoutes } from './modules/tags/tag.routes.js';
import { errorHandler } from './shared/errors.js';
import type { StorageProvider } from './storage/storage-provider.js';

export interface AppDeps {
  env: Env;
  db: Database;
  storage: StorageProvider;
}

export async function buildApp({ env, db, storage }: AppDeps) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(multipart, {
    limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 20, fields: 0 },
  });

  app.setErrorHandler(errorHandler);

  const projects = new ProjectRepository(db);
  const ideas = new IdeaRepository(db);
  const notes = new NoteRepository(db);
  const tags = new TagRepository(db);
  const attachments = new AttachmentService(new AttachmentRepository(db), storage);

  app.get('/api/health', async () => ({ status: 'ok' }));
  await app.register(projectRoutes({ projects, storage }), { prefix: '/api/projects' });
  await app.register(ideaRoutes({ ideas, storage }), { prefix: '/api' });
  await app.register(noteRoutes({ notes, storage }), { prefix: '/api' });
  await app.register(tagRoutes({ tags }), { prefix: '/api' });
  await app.register(attachmentRoutes({ attachments, ideas, notes, storage }), { prefix: '/api' });

  return app;
}
