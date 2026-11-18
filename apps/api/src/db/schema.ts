import { sql } from 'drizzle-orm';
import { bigint, index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const ideaStatus = pgEnum('idea_status', ['backlog', 'in_progress', 'done', 'discarded']);
export const ideaPriority = pgEnum('idea_priority', ['low', 'medium', 'high']);
export const attachmentKind = pgEnum('attachment_kind', ['image', 'video']);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#6366f1'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const ideas = pgTable(
  'ideas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: ideaStatus('status').notNull().default('backlog'),
    priority: ideaPriority('priority').notNull().default('medium'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('ideas_project_id_idx').on(t.projectId),
    index('ideas_status_idx').on(t.status),
    index('ideas_tags_idx').using('gin', t.tags),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ideaId: uuid('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    kind: attachmentKind('kind').notNull(),
    mimeType: text('mime_type').notNull(),
    originalName: text('original_name').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    storageKey: text('storage_key').notNull().unique(),
    createdAt: createdAt(),
  },
  (t) => [index('attachments_idea_id_idx').on(t.ideaId)],
);

export type IdeaStatus = (typeof ideaStatus.enumValues)[number];
export type IdeaPriority = (typeof ideaPriority.enumValues)[number];
export type AttachmentKind = (typeof attachmentKind.enumValues)[number];
export type ProjectRow = typeof projects.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
