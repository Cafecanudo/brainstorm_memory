import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { IdeaSummary } from '../../api/types';
import { StatusBadge } from '../../components/ui';
import { stripMarkdown } from '../../lib/format';
import { AttachmentCount, PriorityLabel, ProjectLabel, TagList, UpdatedAt } from './IdeaParts';

const COLUMNS = 'grid grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_5.5rem] items-center gap-4 md:grid-cols-[3.5rem_minmax(0,1fr)_7.5rem_5.5rem_3rem_7rem] xl:grid-cols-[3.5rem_minmax(0,1fr)_14rem_7.5rem_5.5rem_3rem_7rem]';

export function IdeaList({ ideas, showProject }: { ideas: IdeaSummary[]; showProject: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className={`${COLUMNS} border-b border-line px-4 py-2 text-2xs font-medium tracking-wider text-fg-subtle uppercase`}>
        <span />
        <span>Ideia</span>
        <span className="hidden xl:block">Tags</span>
        <span>Status</span>
        <span>Prioridade</span>
        <span className="hidden md:block">Anexos</span>
        <span className="hidden text-right md:block">Atualizada</span>
      </div>
      <ul className="divide-y divide-line">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <IdeaRow idea={idea} showProject={showProject} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function IdeaRow({ idea, showProject }: { idea: IdeaSummary; showProject: boolean }) {
  const excerpt = stripMarkdown(idea.excerpt);

  return (
    <Link to={`/ideas/${idea.id}`} className={`${COLUMNS} px-4 py-3 text-xs text-fg-subtle transition-colors hover:bg-raised`}>
      <div className="grid h-9 w-14 place-items-center overflow-hidden rounded-md border border-line bg-sunken text-fg-faint">
        {idea.coverAttachmentId ? (
          <img src={api.attachments.contentUrl(idea.coverAttachmentId)} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <FileText className="size-4" />
        )}
      </div>
      <div className="min-w-0">
        <h3 className="truncate font-medium text-fg">{idea.title}</h3>
        <div className="mt-0.5 flex min-w-0 items-center gap-2">
          {showProject && <ProjectLabel idea={idea} className="shrink-0" />}
          {showProject && excerpt && <span className="text-fg-faint">·</span>}
          {excerpt && <p className="truncate text-sm text-fg-muted">{excerpt}</p>}
        </div>
      </div>
      <TagList tags={idea.tags} max={3} className="hidden flex-nowrap overflow-hidden xl:flex" />
      <span>
        <StatusBadge status={idea.status} />
      </span>
      <PriorityLabel priority={idea.priority} />
      <span className="hidden md:block">
        <AttachmentCount count={idea.attachmentCount} />
      </span>
      <UpdatedAt iso={idea.updatedAt} className="hidden text-right md:block" />
    </Link>
  );
}
