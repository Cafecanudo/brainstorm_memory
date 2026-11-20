import { ArrowLeft, Check, FileQuestion, Pencil } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIdea, useProjects, useUpdateIdea } from '../../api/hooks';
import type { IdeaInput } from '../../api/types';
import { ProjectDot } from '../../components/ProjectDot';
import { LazyRichTextEditor } from '../../components/rich-text/LazyRichTextEditor';
import { Button, ButtonLink, EmptyState, Field, PageSpinner, Spinner } from '../../components/ui';
import { isTypingTarget } from '../../lib/files';
import { errorMessage } from '../../lib/format';
import { editIdeaPath, projectIdeasPath } from '../../lib/routes';
import { AttachmentPanel } from '../attachments/AttachmentPanel';
import { toAttachmentItem } from '../attachments/attachmentItems';
import { DeleteIdeaButton } from './DeleteIdeaButton';
import { IdeaDates, PriorityPicker, StatusPicker } from './IdeaPickers';

export function IdeaViewPage() {
  const { id } = useParams();
  return <IdeaView key={id} id={id!} />;
}

function IdeaView({ id }: { id: string }) {
  const navigate = useNavigate();
  const ideaQuery = useIdea(id);
  const { data: projects = [] } = useProjects();
  const update = useUpdateIdea();
  const editPath = editIdeaPath(id);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      event.preventDefault();
      navigate(editPath, { replace: true });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editPath, navigate]);

  if (ideaQuery.isPending) return <PageSpinner />;
  if (ideaQuery.isError) {
    return (
      <div className="mx-auto max-w-xl px-8 py-16 text-center">
        <EmptyState icon={<FileQuestion />} title="Ideia não encontrada" description={errorMessage(ideaQuery.error)} />
        <ButtonLink to="/" className="mt-6">
          Voltar à lista
        </ButtonLink>
      </div>
    );
  }

  const idea = ideaQuery.data;
  const project = projects.find((item) => item.id === idea.projectId);
  const change = (input: Partial<IdeaInput>) => update.mutate({ id, input });

  const goBack = () => {
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate(projectIdeasPath(idea.projectId));
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft />
          Voltar
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {update.isPending ? (
            <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
              <Spinner className="size-3.5" />
              Salvando…
            </span>
          ) : update.isSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
              <Check className="size-3.5 text-emerald-400" />
              Salvo
            </span>
          ) : null}
          <DeleteIdeaButton idea={idea} />
          <ButtonLink to={editPath} replace variant="primary">
            <Pencil />
            Editar
            <kbd className="rounded bg-accent-fg/15 px-1.5 text-2xs font-semibold">E</kbd>
          </ButtonLink>
        </div>
      </div>

      {update.error && (
        <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage(update.error)}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-6">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight">{idea.title}</h1>
          <LazyRichTextEditor
            key={idea.updatedAt}
            value={idea.description}
            editable={false}
            onChange={(description) => change({ description })}
            onRequestEdit={() => navigate(editPath, { replace: true })}
            ariaLabel="Descrição da ideia"
            placeholder=""
            readOnlyPlaceholder="Sem descrição. Pressione E para escrever."
          />
          {idea.attachments.length > 0 && (
            <AttachmentPanel items={idea.attachments.map((attachment) => toAttachmentItem(attachment, idea.description))} />
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Field label="Projeto">
            <span className="inline-flex items-center gap-2 text-sm text-fg-soft">
              <ProjectDot color={project?.color ?? idea.projectColor} />
              {project?.name ?? idea.projectName}
            </span>
          </Field>
          <Field label="Status">
            <StatusPicker value={idea.status} onChange={(status) => change({ status })} />
          </Field>
          <Field label="Prioridade">
            <PriorityPicker value={idea.priority} onChange={(priority) => change({ priority })} />
          </Field>
          {idea.tags.length > 0 && (
            <Field label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {idea.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-raised px-2 py-0.5 text-xs text-fg-soft">
                    #{tag}
                  </span>
                ))}
              </div>
            </Field>
          )}
          <IdeaDates createdAt={idea.createdAt} updatedAt={idea.updatedAt} />
          <p className="text-2xs text-fg-faint">
            <b className="font-semibold text-fg-subtle">E</b> ou dois cliques no texto para editar · status e prioridade mudam na hora
          </p>
        </aside>
      </div>
    </div>
  );
}
