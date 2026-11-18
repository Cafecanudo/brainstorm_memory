import { Link } from 'react-router';
import { api } from '../../api/client';
import type { IdeaSummary } from '../../api/types';
import { StatusBadge } from '../../components/ui';
import { stripMarkdown } from '../../lib/format';
import { AttachmentCount, PriorityLabel, ProjectLabel, TagList, UpdatedAt } from './IdeaParts';

export function IdeaCard({ idea, showProject }: { idea: IdeaSummary; showProject: boolean }) {
  const excerpt = stripMarkdown(idea.excerpt);

  return (
    <Link
      to={`/ideas/${idea.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition hover:border-line-strong hover:bg-raised"
    >
      {idea.coverAttachmentId && (
        <div className="aspect-video overflow-hidden border-b border-line bg-sunken">
          <img
            src={api.attachments.contentUrl(idea.coverAttachmentId)}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {showProject && <ProjectLabel idea={idea} />}
        <h3 className="line-clamp-2 font-medium leading-snug text-fg">{idea.title}</h3>
        {excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{excerpt}</p>}
        <TagList tags={idea.tags} max={4} />
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-fg-subtle">
          <StatusBadge status={idea.status} />
          <PriorityLabel priority={idea.priority} />
          <AttachmentCount count={idea.attachmentCount} />
          <UpdatedAt iso={idea.updatedAt} className="ml-auto" />
        </div>
      </div>
    </Link>
  );
}
