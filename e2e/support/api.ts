import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';

export const uniqueName = (prefix: string) => `${prefix} ${randomUUID().slice(0, 8)}`;

export const uniqueTag = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

export interface CreatedProject {
  id: string;
  name: string;
  color: string;
}

export interface CreatedIdea {
  id: string;
  projectId: string;
  title: string;
}

export async function createProject(request: APIRequestContext, name = uniqueName('Projeto')): Promise<CreatedProject> {
  const response = await request.post('/api/projects', { data: { name, color: '#22c55e' } });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedProject;
}

export async function createIdea(
  request: APIRequestContext,
  input: { projectId: string; title?: string; description?: string; tags?: string[] },
): Promise<CreatedIdea> {
  const response = await request.post('/api/ideas', {
    data: { title: uniqueName('Ideia'), ...input },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedIdea;
}

export interface CreatedNote {
  id: string;
  projectId: string | null;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  version: number;
  updatedAt: string;
}

export async function createNote(
  request: APIRequestContext,
  input: { projectId?: string | null; title?: string; body?: string; tags?: string[]; pinned?: boolean } = {},
): Promise<CreatedNote> {
  const response = await request.post('/api/notes', { data: { title: uniqueName('Anotação'), ...input } });
  expect(response.status()).toBe(201);
  return (await response.json()) as CreatedNote;
}

export const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export interface CreatedAttachment {
  id: string;
  kind: 'image' | 'video';
  originalName: string;
  sizeBytes: number;
}

export async function uploadAttachment(
  request: APIRequestContext,
  owner: 'ideas' | 'notes',
  ownerId: string,
  name = 'print.png',
): Promise<CreatedAttachment> {
  const response = await request.post(`/api/${owner}/${ownerId}/attachments`, {
    multipart: { file: { name, mimeType: 'image/png', buffer: PNG_1PX } },
  });
  expect(response.status()).toBe(201);
  const [attachment] = (await response.json()) as CreatedAttachment[];
  return attachment!;
}
