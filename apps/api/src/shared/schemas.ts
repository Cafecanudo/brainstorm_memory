import { z } from 'zod';

export const idParamSchema = z.object({ id: z.uuid() });

export const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(40))
  .max(20)
  .transform((tags) => [...new Set(tags)]);

export const tagFilterSchema = z.string().trim().toLowerCase().min(1);

export const searchSchema = z.string().trim().min(1).max(200);
