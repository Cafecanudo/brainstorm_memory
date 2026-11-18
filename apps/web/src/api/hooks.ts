import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { IdeaFilters, IdeaInput, ProjectInput } from './types';

export const queryKeys = {
  projects: ['projects'] as const,
  ideas: (filters: IdeaFilters) => ['ideas', filters] as const,
  idea: (id: string) => ['idea', id] as const,
  tags: ['tags'] as const,
};

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
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => invalidate(),
  });
}

export const useIdeas = (filters: IdeaFilters) =>
  useQuery({
    queryKey: queryKeys.ideas(filters),
    queryFn: () => api.ideas.list(filters),
    placeholderData: keepPreviousData,
  });

export const useIdea = (id: string) => useQuery({ queryKey: queryKeys.idea(id), queryFn: () => api.ideas.get(id) });

export const useTags = () => useQuery({ queryKey: queryKeys.tags, queryFn: () => api.tags.list() });

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

export function useUploadAttachments() {
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: ({ ideaId, files, onProgress }: { ideaId: string; files: File[]; onProgress?: (ratio: number) => void }) =>
      api.attachments.upload(ideaId, files, onProgress),
    onSuccess: (_data, { ideaId }) => invalidate(ideaId),
  });
}

export function useDeleteAttachment() {
  const invalidate = useInvalidateIdeas();
  return useMutation({
    mutationFn: ({ id }: { id: string; ideaId: string }) => api.attachments.remove(id),
    onSuccess: (_data, { ideaId }) => invalidate(ideaId),
  });
}
