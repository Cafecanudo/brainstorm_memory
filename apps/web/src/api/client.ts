import type {
  Attachment,
  IdeaDetail,
  IdeaFilters,
  IdeaInput,
  IdeaSummary,
  Project,
  ProjectInput,
} from './types';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string;
  details?: unknown;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (typeof init.body === 'string') headers.set('Content-Type', 'application/json');

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(response.status, body?.message ?? response.statusText, body?.details);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function uploadFiles(ideaId: string, files: File[], onProgress?: (ratio: number) => void): Promise<Attachment[]> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    files.forEach((file, index) => form.append(`file${index}`, file, file.name));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/ideas/${ideaId}/attachments`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Attachment[]);
        return;
      }
      const body = xhr.response as ErrorBody | null;
      reject(new ApiError(xhr.status, body?.message ?? `Falha no upload (${xhr.status})`, body?.details));
    };
    xhr.onerror = () => reject(new ApiError(0, 'Falha de rede no upload'));
    xhr.send(form);
  });
}

export const api = {
  projects: {
    list: () => request<Project[]>('/projects'),
    create: (input: ProjectInput) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: Partial<ProjectInput>) =>
      request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  ideas: {
    list: (filters: IdeaFilters) => request<IdeaSummary[]>(`/ideas${toQuery({ ...filters })}`),
    get: (id: string) => request<IdeaDetail>(`/ideas/${id}`),
    create: (input: IdeaInput) => request<IdeaDetail>('/ideas', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, input: Partial<IdeaInput>) =>
      request<IdeaDetail>(`/ideas/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    remove: (id: string) => request<void>(`/ideas/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: (projectId?: string) => request<string[]>(`/tags${toQuery({ projectId })}`),
  },
  attachments: {
    upload: uploadFiles,
    remove: (id: string) => request<void>(`/attachments/${id}`, { method: 'DELETE' }),
    contentUrl: (id: string, download = false) =>
      `${BASE_URL}/attachments/${id}/content${download ? '?download=true' : ''}`,
  },
};
