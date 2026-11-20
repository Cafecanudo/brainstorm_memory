import { eq, sql, type AnyColumn } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { ideas, notes } from '../../db/schema.js';

export type TagSource = 'idea' | 'note';

export interface TagFilters {
  projectId?: string;
  kind?: TagSource;
}

const unnested = (column: AnyColumn) => ({ tag: sql<string>`unnest(${column})`.as('tag') });

export class TagRepository {
  constructor(private readonly db: Database) {}

  async list({ projectId, kind }: TagFilters): Promise<string[]> {
    const ideaFilter = projectId ? eq(ideas.projectId, projectId) : undefined;
    const noteFilter = projectId ? eq(notes.projectId, projectId) : undefined;

    const rows =
      kind === 'idea'
        ? await this.db.selectDistinct(unnested(ideas.tags)).from(ideas).where(ideaFilter).orderBy(sql`1`)
        : kind === 'note'
          ? await this.db.selectDistinct(unnested(notes.tags)).from(notes).where(noteFilter).orderBy(sql`1`)
          : await this.db
              .select(unnested(ideas.tags))
              .from(ideas)
              .where(ideaFilter)
              .union(this.db.select(unnested(notes.tags)).from(notes).where(noteFilter))
              .orderBy(sql`1`);
    return rows.map((row) => row.tag);
  }
}
