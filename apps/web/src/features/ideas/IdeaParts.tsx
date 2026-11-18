import { Flag, Paperclip } from 'lucide-react';
import type { IdeaPriority, IdeaSummary } from '../../api/types';
import { cx } from '../../components/ui';
import { PRIORITY_META } from '../../lib/constants';
import { formatDateTime, formatRelative } from '../../lib/format';

export function ProjectLabel({ idea, className }: { idea: IdeaSummary; className?: string }) {
  return (
    <span className={cx('flex min-w-0 items-center gap-1.5 text-xs text-fg-subtle', className)}>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: idea.projectColor }} />
      <span className="truncate">{idea.projectName}</span>
    </span>
  );
}

export function PriorityLabel({ priority, className }: { priority: IdeaPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cx('flex items-center gap-1', meta.className, className)}>
      <Flag className="size-3 shrink-0" />
      {meta.label}
    </span>
  );
}

export function AttachmentCount({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span className={cx('flex items-center gap-1', className)} title={`${count} ${count === 1 ? 'anexo' : 'anexos'}`}>
      <Paperclip className="size-3 shrink-0" />
      {count}
    </span>
  );
}

export function UpdatedAt({ iso, className }: { iso: string; className?: string }) {
  return (
    <span className={cx('whitespace-nowrap', className)} title={formatDateTime(iso)}>
      {formatRelative(iso)}
    </span>
  );
}

export function TagList({ tags, max, className }: { tags: string[]; max: number; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <div className={cx('flex flex-wrap gap-1', className)}>
      {tags.slice(0, max).map((tag) => (
        <span key={tag} className="rounded bg-raised px-1.5 py-0.5 text-2xs text-fg-muted">
          #{tag}
        </span>
      ))}
      {tags.length > max && <span className="px-1 text-2xs text-fg-faint">+{tags.length - max}</span>}
    </div>
  );
}
