ALTER TABLE "attachments" ALTER COLUMN "idea_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "note_id" uuid;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_note_id_idx" ON "attachments" USING btree ("note_id");--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_single_owner_check" CHECK (num_nonnulls("attachments"."idea_id", "attachments"."note_id") = 1);