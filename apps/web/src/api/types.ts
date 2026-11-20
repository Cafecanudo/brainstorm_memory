export type IdeaStatus = 'backlog' | 'in_progress' | 'done' | 'discarded';
export type IdeaPriority = 'low' | 'medium' | 'high';
export type AttachmentKind = 'image' | 'video';

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  ideaCount: number;
  openCount: number;
  noteCount: number;
  attachmentCount: number;
}

export interface ProjectInput {
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  createdAt: string;
}

interface IdeaBase {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  title: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IdeaSummary extends IdeaBase {
  excerpt: string;
  attachmentCount: number;
  coverAttachmentId: string | null;
}

export interface IdeaDetail extends IdeaBase {
  description: string;
  attachments: Attachment[];
}

export interface IdeaInput {
  projectId: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
}

export interface IdeaFilters {
  projectId?: string;
  status?: IdeaStatus;
  priority?: IdeaPriority;
  tag?: string;
  q?: string;
}

export type AttachmentOwner = 'ideas' | 'notes';

export const UNASSIGNED_PROJECT = 'none';

interface NoteBase {
  id: string;
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
  title: string;
  tags: string[];
  pinned: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteSummary extends NoteBase {
  excerpt: string;
}

export interface NoteDetail extends NoteBase {
  body: string;
  attachments: Attachment[];
}

export interface NoteInput {
  projectId: string | null;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
}

export interface NoteFilters {
  projectId?: string;
  tag?: string;
  q?: string;
}

export interface NoteCounts {
  total: number;
  unassigned: number;
}
