import type { IdeaPriority, IdeaStatus } from '../api/types';

export interface StatusMeta {
  value: IdeaStatus;
  label: string;
  className: string;
}

export const STATUS_OPTIONS: StatusMeta[] = [
  { value: 'backlog', label: 'Backlog', className: 'bg-zinc-500/10 text-zinc-300 ring-zinc-500/30' },
  { value: 'in_progress', label: 'Em andamento', className: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  { value: 'done', label: 'Feito', className: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  { value: 'discarded', label: 'Descartado', className: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' },
];

export const STATUS_META = Object.fromEntries(STATUS_OPTIONS.map((option) => [option.value, option])) as Record<
  IdeaStatus,
  StatusMeta
>;

export interface PriorityMeta {
  value: IdeaPriority;
  label: string;
  className: string;
}

export const PRIORITY_OPTIONS: PriorityMeta[] = [
  { value: 'high', label: 'Alta', className: 'text-rose-400' },
  { value: 'medium', label: 'Média', className: 'text-sky-400' },
  { value: 'low', label: 'Baixa', className: 'text-zinc-500' },
];

export const PRIORITY_META = Object.fromEntries(PRIORITY_OPTIONS.map((option) => [option.value, option])) as Record<
  IdeaPriority,
  PriorityMeta
>;

export const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/webm', 'video/mp4'];

export const PROJECT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16'];
