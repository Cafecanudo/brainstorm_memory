import { eq } from 'drizzle-orm';
import type { Database } from '../../db/client.js';
import { attachments, type AttachmentRow } from '../../db/schema.js';

export type AttachmentCreate = typeof attachments.$inferInsert;

export class AttachmentRepository {
  constructor(private readonly db: Database) {}

  async create(input: AttachmentCreate): Promise<AttachmentRow> {
    const [row] = await this.db.insert(attachments).values(input).returning();
    return row!;
  }

  async findById(id: string): Promise<AttachmentRow | null> {
    const [row] = await this.db.select().from(attachments).where(eq(attachments.id, id));
    return row ?? null;
  }

  async delete(id: string): Promise<AttachmentRow | null> {
    const [row] = await this.db.delete(attachments).where(eq(attachments.id, id)).returning();
    return row ?? null;
  }
}
