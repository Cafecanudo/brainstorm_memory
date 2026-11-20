import { and, arrayContains, asc, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { attachments, notes, projects } from '../../db/schema.js';
import { containsPattern } from '../../shared/sql.js';

export interface NoteFilters {
  projectId?: string | null;
  tag?: string;
  q?: string;
}

export interface NoteCreate {
  projectId: string | null;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
}

export type NoteUpdate = Partial<NoteCreate>;

export type NoteDetail = NonNullable<Awaited<ReturnType<NoteRepository['findById']>>>;

export type NoteUpdateResult =
  | { status: 'updated'; note: NoteDetail }
  | { status: 'conflict'; current: NoteDetail }
  | { status: 'not_found' };

const summaryColumns = {
  id: notes.id,
  projectId: notes.projectId,
  projectName: projects.name,
  projectColor: projects.color,
  title: notes.title,
  tags: notes.tags,
  pinned: notes.pinned,
  version: notes.version,
  createdAt: notes.createdAt,
  updatedAt: notes.updatedAt,
};

export class NoteRepository {
  constructor(private readonly db: Database) {}

  list(filters: NoteFilters) {
    const conditions: SQL[] = [];
    if (filters.projectId === null) conditions.push(isNull(notes.projectId));
    else if (filters.projectId) conditions.push(eq(notes.projectId, filters.projectId));
    if (filters.tag) conditions.push(arrayContains(notes.tags, [filters.tag]));
    if (filters.q) {
      const pattern = containsPattern(filters.q);
      conditions.push(
        or(ilike(notes.title, pattern), ilike(notes.body, pattern), sql`array_to_string(${notes.tags}, ' ') ilike ${pattern}`)!,
      );
    }

    return this.db
      .select({ ...summaryColumns, excerpt: sql<string>`left(${notes.body}, 240)` })
      .from(notes)
      .leftJoin(projects, eq(projects.id, notes.projectId))
      .where(and(...conditions))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt))
      .limit(500);
  }

  async findById(id: string) {
    const [note] = await this.db
      .select({ ...summaryColumns, body: notes.body })
      .from(notes)
      .leftJoin(projects, eq(projects.id, notes.projectId))
      .where(eq(notes.id, id));
    if (!note) return null;

    const noteAttachments = await this.db
      .select({
        id: attachments.id,
        kind: attachments.kind,
        mimeType: attachments.mimeType,
        originalName: attachments.originalName,
        sizeBytes: attachments.sizeBytes,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.noteId, id))
      .orderBy(asc(attachments.createdAt));

    return { ...note, attachments: noteAttachments };
  }

  async exists(id: string): Promise<boolean> {
    const [row] = await this.db.select({ id: notes.id }).from(notes).where(eq(notes.id, id));
    return Boolean(row);
  }

  async touch(id: string): Promise<void> {
    await this.db.update(notes).set({ updatedAt: new Date() }).where(eq(notes.id, id));
  }

  async counts(): Promise<{ total: number; unassigned: number }> {
    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        unassigned: sql<number>`(count(*) filter (where ${notes.projectId} is null))::int`,
      })
      .from(notes);
    return row ?? { total: 0, unassigned: 0 };
  }

  async create(input: NoteCreate): Promise<NoteDetail> {
    const [row] = await this.db.insert(notes).values(input).returning({ id: notes.id });
    return (await this.findById(row!.id))!;
  }

  async update(id: string, expectedVersion: number, input: NoteUpdate): Promise<NoteUpdateResult> {
    const [row] = await this.db
      .update(notes)
      .set({ ...input, version: sql`${notes.version} + 1`, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.version, expectedVersion)))
      .returning({ id: notes.id });

    const current = await this.findById(id);
    if (!current) return { status: 'not_found' };
    return row ? { status: 'updated', note: current } : { status: 'conflict', current };
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
    return deleted.length > 0;
  }
}
