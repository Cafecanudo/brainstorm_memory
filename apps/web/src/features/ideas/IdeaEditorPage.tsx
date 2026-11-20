import { FileQuestion, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
import type { InlineImage, RichTextEditorHandle } from '../../components/rich-text/types';
import { Button, ButtonLink, EmptyState, PageSpinner } from '../../components/ui';
import { errorMessage, formatDateTime } from '../../lib/format';
import { projectIdeasPath } from '../../lib/routes';
import { AttachmentPanel } from '../attachments/AttachmentPanel';
import { toAttachmentItem, toInlineImage } from '../attachments/attachmentItems';
import { IdeaForm } from './IdeaForm';

export function IdeaEditorPage() {
  const { id } = useParams();
  return id ? <ExistingIdea key={id} id={id} /> : <NewIdea />;
}

interface PendingFile {
  key: string;
  file: File;
  url: string;
}

const toPending = (file: File): PendingFile => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) });

const kindOf = (file: File) => (file.type.startsWith('video/') ? 'video' : 'image');

function replaceAll(text: string, replacements: Map<string, string>): string {
  let result = text;
  replacements.forEach((target, source) => {
    result = result.split(source).join(target);
  });
  return result;
}

function NewIdea() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const { data: tags = [] } = useTags();
  const createIdea = useCreateIdea();
  const updateIdea = useUpdateIdea();
  const upload = useUploadAttachments();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingFile[]>(() =>
    ((location.state as { files?: File[] } | null)?.files ?? []).map(toPending),
  );
  const pendingRef = useRef(pending);

  useEffect(() => {
    pendingRef.current = pending;
  });

  useEffect(() => () => pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

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

  const addFiles = (files: File[]) => {
    const added = files.map(toPending);
    setPending((current) => [...current, ...added]);
    return added;
  };

  const uploadImages = async (files: File[]): Promise<InlineImage[]> =>
    addFiles(files).map((item) => ({ src: item.url, alt: item.file.name }));

  const handleSubmit = async (values: IdeaInput) => {
    const idea = await createIdea.mutateAsync(values);
    if (pending.length > 0) {
      setProgress(0);
      try {
        const created = await upload.mutateAsync({
          owner: 'ideas',
          ownerId: idea.id,
          files: pending.map((item) => item.file),
          onProgress: setProgress,
        });
        const replacements = new Map(pending.map((item, index) => [item.url, api.attachments.contentUrl(created[index]!.id)]));
        const description = replaceAll(values.description, replacements);
        if (description !== values.description) await updateIdea.mutateAsync({ id: idea.id, input: { description } });
      } catch (error) {
        window.alert(`A ideia foi salva, mas o upload dos anexos falhou: ${errorMessage(error)}`);
      }
    }
    navigate(projectIdeasPath(values.projectId), { replace: true });
  };

  return (
    <IdeaForm
      initial={initial}
      projects={projects}
      tagSuggestions={tags}
      submitLabel="Criar ideia"
      submitting={createIdea.isPending || upload.isPending || updateIdea.isPending}
      error={createIdea.error}
      editorRef={editorRef}
      uploadImages={uploadImages}
      onSubmit={handleSubmit}
    >
      {({ description }) => (
        <AttachmentPanel
          items={pending.map(({ key, file, url }) => ({
            key,
            file,
            src: url,
            kind: kindOf(file),
            name: file.name,
            sizeBytes: file.size,
            inText: description.includes(url),
          }))}
          progress={progress}
          note={pending.length ? 'Enviados ao criar a ideia' : undefined}
          onFiles={addFiles}
          onInsert={(item) => item.src && editorRef.current?.insertImage({ src: item.src, alt: item.name })}
          onRemove={(key) => {
            const item = pending.find((entry) => entry.key === key);
            if (!item) return;
            editorRef.current?.removeImages(item.url);
            URL.revokeObjectURL(item.url);
            setPending((current) => current.filter((entry) => entry.key !== key));
          }}
        />
      )}
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
  const editorRef = useRef<RichTextEditorHandle>(null);
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

  const uploadFiles = async (files: File[]) => {
    setProgress(0);
    try {
      return await upload.mutateAsync({ owner: 'ideas', ownerId: id, files, onProgress: setProgress });
    } finally {
      setProgress(null);
    }
  };

  const uploadImages = async (files: File[]): Promise<InlineImage[]> => (await uploadFiles(files)).map(toInlineImage);

  const handleDelete = async () => {
    if (!window.confirm(`Excluir a ideia "${idea.title}"? Os anexos também serão apagados.`)) return;
    await remove.mutateAsync(id);
    navigate(projectIdeasPath(idea.projectId), { replace: true });
  };

  const attachmentError = upload.error ?? deleteAttachment.error;

  return (
    <IdeaForm
      initial={toInput(idea)}
      projects={projectsQuery.data ?? []}
      tagSuggestions={tags}
      submitLabel="Salvar"
      submitting={update.isPending || upload.isPending}
      error={update.error ?? remove.error}
      editorRef={editorRef}
      uploadImages={uploadImages}
      onSubmit={async (values) => {
        await update.mutateAsync({ id, input: values });
        navigate(projectIdeasPath(values.projectId), { replace: true });
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
      {({ description }) => (
        <AttachmentPanel
          items={idea.attachments.map((attachment) => toAttachmentItem(attachment, description))}
          progress={progress}
          error={attachmentError ? errorMessage(attachmentError) : null}
          onFiles={(files) => void uploadFiles(files).catch(() => undefined)}
          onInsert={(item) => item.src && editorRef.current?.insertImage({ src: item.src, alt: item.name })}
          onRemove={(attachmentId) => {
            editorRef.current?.removeImages(api.attachments.contentUrl(attachmentId));
            deleteAttachment.mutate({ id: attachmentId, owner: 'ideas', ownerId: id });
          }}
        />
      )}
    </IdeaForm>
  );
}
