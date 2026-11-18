import { and, arrayContains, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import {
  attachments,
  ideas,
  projects,
  type IdeaPriority,
  type IdeaRow,
  type IdeaStatus,
} from '../../db/schema.js';

export interface IdeaFilters {
  projectId?: string;
  status?: IdeaStatus;
  tag?: string;
  q?: string;
}

export interface IdeaCreate {
  projectId: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
}

export type IdeaUpdate = Partial<IdeaCreate>;

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export class IdeaRepository {
  constructor(private readonly db: Database) {}

  list(filters: IdeaFilters) {
    const conditions: SQL[] = [];
    if (filters.projectId) conditions.push(eq(ideas.projectId, filters.projectId));
    if (filters.status) conditions.push(eq(ideas.status, filters.status));
    if (filters.tag) conditions.push(arrayContains(ideas.tags, [filters.tag]));
    if (filters.q) {
      const pattern = `%${escapeLike(filters.q)}%`;
      conditions.push(or(ilike(ideas.title, pattern), ilike(ideas.description, pattern))!);
    }

    return this.db
      .select({
        id: ideas.id,
        projectId: ideas.projectId,
        projectName: projects.name,
        projectColor: projects.color,
        title: ideas.title,
        excerpt: sql<string>`left(${ideas.description}, 240)`,
        status: ideas.status,
        priority: ideas.priority,
        tags: ideas.tags,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
        attachmentCount: sql<number>`(select count(*)::int from ${attachments} where ${attachments.ideaId} = ${ideas.id})`,
        coverAttachmentId: sql<string | null>`(
          select ${attachments.id} from ${attachments}
          where ${attachments.ideaId} = ${ideas.id} and ${attachments.kind} = 'image'
          order by ${attachments.createdAt} limit 1
        )`,
      })
      .from(ideas)
      .innerJoin(projects, eq(projects.id, ideas.projectId))
      .where(and(...conditions))
      .orderBy(desc(ideas.updatedAt))
      .limit(500);
  }

  async findById(id: string) {
    const [idea] = await this.db
      .select({
        id: ideas.id,
        projectId: ideas.projectId,
        projectName: projects.name,
        projectColor: projects.color,
        title: ideas.title,
        description: ideas.description,
        status: ideas.status,
        priority: ideas.priority,
        tags: ideas.tags,
        createdAt: ideas.createdAt,
        updatedAt: ideas.updatedAt,
      })
      .from(ideas)
      .innerJoin(projects, eq(projects.id, ideas.projectId))
      .where(eq(ideas.id, id));
    if (!idea) return null;

    const ideaAttachments = await this.db
      .select({
        id: attachments.id,
        kind: attachments.kind,
        mimeType: attachments.mimeType,
        originalName: attachments.originalName,
        sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.ideaId, id))
      .orderBy(asc(attachments.createdAt));

    return { ...idea, attachments: ideaAttachments };
  }

  async exists(id: string): Promise<boolean> {
    const [row] = await this.db.select({ id: ideas.id }).from(ideas).where(eq(ideas.id, id));
    return Boolean(row);
  }

  async create(input: IdeaCreate): Promise<IdeaRow> {
    const [row] = await this.db.insert(ideas).values(input).returning();
    return row!;
  }

  async update(id: string, input: IdeaUpdate): Promise<IdeaRow | null> {
    const [row] = await this.db
      .update(ideas)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(ideas.id, id))
      .returning();
    return row ?? null;
  }

  async touch(id: string): Promise<void> {
    await this.db.update(ideas).set({ updatedAt: new Date() }).where(eq(ideas.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(ideas).where(eq(ideas.id, id)).returning({ id: ideas.id });
    return deleted.length > 0;
  }

  async listTags(projectId?: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ tag: sql<string>`unnest(${ideas.tags})`.as('tag') })
      .from(ideas)
      .where(projectId ? eq(ideas.projectId, projectId) : undefined)
      .orderBy(sql`1`);
    return rows.map((row) => row.tag);
  }
}
