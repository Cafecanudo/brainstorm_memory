import { FileQuestion, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import {
  useCreateIdea,
  useDeleteAttachment,
  useDeleteIdea,
  useIdea,
  useProjects,
  useTags,
  useUpdateIdea,
  useUploadAttachments,
} from '../../api/hooks';
import type { IdeaDetail, IdeaInput } from '../../api/types';
import { Button, ButtonLink, EmptyState, PageSpinner } from '../../components/ui';
import { errorMessage, formatDateTime } from '../../lib/format';
import { AttachmentPanel, type AttachmentItem } from '../attachments/AttachmentPanel';
import { IdeaForm } from './IdeaForm';

export function IdeaEditorPage() {
  const { id } = useParams();
  return id ? <ExistingIdea key={id} id={id} /> : <NewIdea />;
}

interface PendingFile {
  key: string;
  file: File;
}

function NewIdea() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const { data: tags = [] } = useTags();
  const createIdea = useCreateIdea();
  const upload = useUploadAttachments();
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingFile[]>(() =>
    ((location.state as { files?: File[] } | null)?.files ?? []).map((file) => ({ key: crypto.randomUUID(), file })),
  );

  if (projectsQuery.isPending) return <PageSpinner />;
  const projects = projectsQuery.data ?? [];
  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-8 py-16">
        <EmptyState
          icon={<FileQuestion />}
          title="Nenhum projeto cadastrado"
          description="Crie um projeto na barra lateral antes de registrar ideias."
        />
      </div>
    );
  }

  const requestedProject = params.get('project');
  const initial: IdeaInput = {
    projectId: projects.some((project) => project.id === requestedProject) ? requestedProject! : projects[0]!.id,
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    tags: [],
  };

  const handleSubmit = async (values: IdeaInput) => {
    const idea = await createIdea.mutateAsync(values);
    if (pending.length > 0) {
      setProgress(0);
      try {
        await upload.mutateAsync({ ideaId: idea.id, files: pending.map((item) => item.file), onProgress: setProgress });
      } catch (error) {
        window.alert(`A ideia foi salva, mas o upload dos anexos falhou: ${errorMessage(error)}`);
      }
    }
    navigate(`/ideas/${idea.id}`, { replace: true });
  };

  const items: AttachmentItem[] = pending.map(({ key, file }) => ({
    key,
    file,
    kind: file.type.startsWith('video/') ? 'video' : 'image',
    name: file.name,
    sizeBytes: file.size,
  }));

  return (
    <IdeaForm
      initial={initial}
      projects={projects}
      tagSuggestions={tags}
      submitLabel="Criar ideia"
      submitting={createIdea.isPending || upload.isPending}
      error={createIdea.error}
      onSubmit={handleSubmit}
    >
      <AttachmentPanel
        items={items}
        progress={progress}
        note={pending.length ? 'Enviados ao criar a ideia' : undefined}
        onFiles={(files) =>
          setPending((current) => [...current, ...files.map((file) => ({ key: crypto.randomUUID(), file }))])
        }
        onRemove={(key) => setPending((current) => current.filter((item) => item.key !== key))}
      />
    </IdeaForm>
  );
}

function toInput(idea: IdeaDetail): IdeaInput {
  return {
    projectId: idea.projectId,
    title: idea.title,
    description: idea.description,
    status: idea.status,
    priority: idea.priority,
    tags: idea.tags,
  };
}

function ExistingIdea({ id }: { id: string }) {
  const navigate = useNavigate();
  const ideaQuery = useIdea(id);
  const projectsQuery = useProjects();
  const { data: tags = [] } = useTags();
  const update = useUpdateIdea();
  const remove = useDeleteIdea();
  const upload = useUploadAttachments();
  const deleteAttachment = useDeleteAttachment();
  const [progress, setProgress] = useState<number | null>(null);

  if (ideaQuery.isPending || projectsQuery.isPending) return <PageSpinner />;
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

  const handleFiles = (files: File[]) => {
    setProgress(0);
    upload.mutate({ ideaId: id, files, onProgress: setProgress }, { onSettled: () => setProgress(null) });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const attachment = idea.attachments.find((item) => item.id === attachmentId);
    if (!attachment || !window.confirm(`Remover o anexo "${attachment.originalName}"?`)) return;
    deleteAttachment.mutate({ id: attachmentId, ideaId: id });
  };

  const handleDelete = async () => {
    if (!window.confirm(`Excluir a ideia "${idea.title}"? Os anexos também serão apagados.`)) return;
    await remove.mutateAsync(id);
    navigate(`/?project=${idea.projectId}`, { replace: true });
  };

  const items: AttachmentItem[] = idea.attachments.map((attachment) => ({
    key: attachment.id,
    kind: attachment.kind,
    name: attachment.originalName,
    sizeBytes: attachment.sizeBytes,
    src: api.attachments.contentUrl(attachment.id),
    downloadUrl: api.attachments.contentUrl(attachment.id, true),
  }));

  const attachmentError = upload.error ?? deleteAttachment.error;

  return (
    <IdeaForm
      initial={toInput(idea)}
      projects={projectsQuery.data ?? []}
      tagSuggestions={tags}
      submitLabel="Salvar"
      submitting={update.isPending}
      error={update.error ?? remove.error}
      previewFirst={Boolean(idea.description.trim())}
      onSubmit={async (values) => {
        await update.mutateAsync({ id, input: values });
      }}
      headerActions={
        <Button variant="danger" size="icon" title="Excluir ideia" onClick={handleDelete} disabled={remove.isPending}>
          <Trash2 />
        </Button>
      }
      meta={
        <dl className="space-y-1 border-t border-line pt-4 text-xs text-fg-subtle">
          <div className="flex justify-between gap-2">
            <dt>Criada</dt>
            <dd className="text-fg-muted">{formatDateTime(idea.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Atualizada</dt>
            <dd className="text-fg-muted">{formatDateTime(idea.updatedAt)}</dd>
          </div>
        </dl>
      }
    >
      <AttachmentPanel
        items={items}
        progress={progress}
        error={attachmentError ? errorMessage(attachmentError) : null}
        onFiles={handleFiles}
        onRemove={handleRemoveAttachment}
      />
    </IdeaForm>
  );
}
