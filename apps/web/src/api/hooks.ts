import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { AttachmentOwner, IdeaFilters, IdeaInput, NoteFilters, ProjectInput } from './types';

export const queryKeys = {
  projects: ['projects'] as const,
  ideas: (filters: IdeaFilters) => ['ideas', filters] as const,
  idea: (id: string) => ['idea', id] as const,
  tags: ['tags'] as const,
  notes: (filters: NoteFilters) => ['notes', filters] as const,
  note: (id: string) => ['note', id] as const,
  noteCounts: ['note-counts'] as const,
};

export function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return (noteId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notes'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.noteCounts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      noteId ? queryClient.invalidateQueries({ queryKey: queryKeys.note(noteId) }) : undefined,
    ]);
}

function useInvalidateIdeas() {
  const queryClient = useQueryClient();
  return (ideaId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['ideas'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      ideaId ? queryClient.invalidateQueries({ queryKey: queryKeys.idea(ideaId) }) : undefined,
    ]);
}

export const useProjects = () => useQuery({ queryKey: queryKeys.projects, queryFn: api.projects.list });

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => api.projects.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  });
}

export function useUpdateProject() {
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProjectInput> }) => api.projects.update(id, input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteProject() {
  const invalidateIdeas = useInvalidateIdeas();
  const invalidateNotes = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => Promise.all([invalidateIdeas(), invalidateNotes()]),
  });
}

export const useIdeas = (filters: IdeaFilters) =>
  useQuery({
    queryKey: queryKeys.ideas(filters),
    queryFn: () => api.ideas.list(filters),
    placeholderData: keepPreviousData,
  });

export const useIdea = (id: string) => useQuery({ queryKey: queryKeys.idea(id), queryFn: () => api.ideas.get(id) });

export const useTags = (kind?: 'idea' | 'note') =>
  useQuery({ queryKey: [...queryKeys.tags, kind ?? 'all'], queryFn: () => api.tags.list({ kind }) });

export function useCreateIdea() {
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: (input: IdeaInput) => api.ideas.create(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateIdea() {
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<IdeaInput> }) => api.ideas.update(id, input),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: (id: string) => api.ideas.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.idea(id) });
      return invalidate();
    },
  });
}

interface AttachmentTarget {
  owner: AttachmentOwner;
  ownerId: string;
}

function useInvalidateOwner() {
  const invalidateIdeas = useInvalidateIdeas();
  const invalidateNotes = useInvalidateNotes();
  return ({ owner, ownerId }: AttachmentTarget) => (owner === 'ideas' ? invalidateIdeas(ownerId) : invalidateNotes(ownerId));
}

export function useUploadAttachments() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: ({ owner, ownerId, files, onProgress }: AttachmentTarget & { files: File[]; onProgress?: (ratio: number) => void }) =>
      api.attachments.upload(owner, ownerId, files, onProgress),
    onSuccess: (_data, target) => invalidate(target),
  });
}

export function useDeleteAttachment() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: ({ id }: AttachmentTarget & { id: string }) => api.attachments.remove(id),
    onSuccess: (_data, target) => invalidate(target),
  });
}

export const useNotes = (filters: NoteFilters) =>
  useQuery({
    queryKey: queryKeys.notes(filters),
    queryFn: () => api.notes.list(filters),
    placeholderData: keepPreviousData,
  });

export const useNote = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.note(id ?? ''),
    queryFn: () => api.notes.get(id!),
    enabled: Boolean(id),
  });

export const useNoteCounts = () => useQuery({ queryKey: queryKeys.noteCounts, queryFn: api.notes.counts });

export function useDeleteNote() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (id: string) => api.notes.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.note(id) });
      return invalidate();
    },
  });
}
