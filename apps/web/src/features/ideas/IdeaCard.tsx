import { Flag, Paperclip } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { IdeaSummary } from '../../api/types';
import { StatusBadge, cx } from '../../components/ui';
import { PRIORITY_META } from '../../lib/constants';
import { formatDateTime, formatRelative, stripMarkdown } from '../../lib/format';

export function IdeaCard({ idea, showProject }: { idea: IdeaSummary; showProject: boolean }) {
  const priority = PRIORITY_META[idea.priority];
  const excerpt = stripMarkdown(idea.excerpt);

  return (
    <Link
      to={`/ideas/${idea.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/50 transition hover:border-zinc-700 hover:bg-zinc-900"
    >
      {idea.coverAttachmentId && (
        <div className="aspect-video overflow-hidden border-b border-zinc-800/80 bg-zinc-950">
          <img
            src={api.attachments.contentUrl(idea.coverAttachmentId)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {showProject && (
          <span className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="size-2 rounded-full" style={{ backgroundColor: idea.projectColor }} />
            {idea.projectName}
          </span>
        )}
        <h3 className="line-clamp-2 font-medium leading-snug text-zinc-100">{idea.title}</h3>
        {excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">{excerpt}</p>}
        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {idea.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] text-zinc-400">
                #{tag}
              </span>
            ))}
            {idea.tags.length > 4 && <span className="px-1 text-[11px] text-zinc-600">+{idea.tags.length - 4}</span>}
          </div>
        )}
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-zinc-500">
          <StatusBadge status={idea.status} />
          <span className={cx('flex items-center gap-1', priority.className)}>
            <Flag className="size-3" />
            {priority.label}
          </span>
          {idea.attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="size-3" />
              {idea.attachmentCount}
            </span>
          )}
          <span className="ml-auto whitespace-nowrap" title={formatDateTime(idea.updatedAt)}>
            {formatRelative(idea.updatedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
