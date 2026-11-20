import { asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { attachments, ideas, notes, projects, type ProjectRow } from '../../db/schema.js';

export interface ProjectInput {
  name: string;
  color: string;
}

export class ProjectRepository {
  constructor(private readonly db: Database) {}

  list() {
    return this.db
      .select({
        id: projects.id,
        name: projects.name,
        color: projects.color,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        ideaCount: sql<number>`count(${ideas.id})::int`,
        openCount: sql<number>`(count(${ideas.id}) filter (where ${ideas.status} in ('backlog', 'in_progress')))::int`,
        noteCount: sql<number>`(select count(*)::int from ${notes} where ${notes.projectId} = ${projects.id})`,
        attachmentCount: sql<number>`(
          select count(*)::int from ${attachments}
          where ${attachments.ideaId} in (select project_ideas.id from ${ideas} as project_ideas where project_ideas.project_id = ${projects.id})
             or ${attachments.noteId} in (select project_notes.id from ${notes} as project_notes where project_notes.project_id = ${projects.id})
        )`,
      })
      .from(projects)
      .leftJoin(ideas, eq(ideas.projectId, projects.id))
      .groupBy(projects.id)
      .orderBy(asc(projects.name));
  }

  async create(input: ProjectInput): Promise<ProjectRow> {
    const [row] = await this.db.insert(projects).values(input).returning();
    return row!;
  }

  async update(id: string, input: Partial<ProjectInput>): Promise<ProjectRow | null> {
    const [row] = await this.db
      .update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return row ?? null;
  }

  async delete(id: string): Promise<string[] | null> {
    return this.db.transaction(async (tx) => {
      const ideaRows = await tx.select({ id: ideas.id }).from(ideas).where(eq(ideas.projectId, id));
      const noteRows = await tx.select({ id: notes.id }).from(notes).where(eq(notes.projectId, id));
      const deleted = await tx.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id });
      return deleted.length ? [...ideaRows, ...noteRows].map((row) => row.id) : null;
    });
  }
}
