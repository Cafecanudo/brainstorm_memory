export const projectIdeasPath = (projectId: string) => `/?project=${projectId}`;

export const ideaPath = (id: string) => `/ideas/${id}`;

export const editIdeaPath = (id: string) => `/ideas/${id}/edit`;

export const NEW_NOTE = 'new';

export function notesPath(noteId?: string, search: string | URLSearchParams = ''): string {
  const query = search.toString().replace(/^\?/, '');
  return `/notes${noteId ? `/${noteId}` : ''}${query ? `?${query}` : ''}`;
}

export const projectNotesPath = (projectFilter: string) => notesPath(undefined, new URLSearchParams({ project: projectFilter }));
