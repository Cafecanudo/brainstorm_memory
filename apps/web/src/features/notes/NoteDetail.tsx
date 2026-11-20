import { Check, ChevronDown, CircleAlert, CloudOff, FileQuestion, FilePenLine, GitCompareArrows, Pencil, Pin, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../../api/client';
import { useDeleteAttachment, useDeleteNote, useNote, useProjects, useTags, useUploadAttachments } from '../../api/hooks';
import type { NoteDetail as Note, Project } from '../../api/types';
import { HoldButton } from '../../components/HoldButton';
import { LazyRichTextEditor } from '../../components/rich-text/LazyRichTextEditor';
import type { InlineImage, RichTextEditorHandle } from '../../components/rich-text/types';
import { TagInput } from '../../components/TagInput';
import { EmptyState, Kbd, PageSpinner, Spinner, cx } from '../../components/ui';
import { isTypingTarget } from '../../lib/files';
import { errorMessage, formatDateTime, formatRelative } from '../../lib/format';
import { NEW_NOTE, notesPath } from '../../lib/routes';
import { ProjectDot } from '../../components/ProjectDot';
import { AttachmentPanel } from '../attachments/AttachmentPanel';
import { toAttachmentItem, toInlineImage } from '../attachments/attachmentItems';
import { useNoteAutosave, type SaveStatus } from './useNoteAutosave';

interface NoteDetailProps {
  noteId: string;
  defaultProjectId: string | null;
  search: string;
}

export function NoteDetail({ noteId, defaultProjectId, search }: NoteDetailProps) {
  const isNew = noteId === NEW_NOTE;
  const noteQuery = useNote(isNew ? undefined : noteId);

  if (isNew) return <NoteWorkspace initial={null} defaultProjectId={defaultProjectId} search={search} />;
  if (noteQuery.isPending) return <PageSpinner />;
  if (noteQuery.isError) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <EmptyState icon={<FileQuestion />} title="Anotação não encontrada" description={errorMessage(noteQuery.error)} />
      </div>
    );
  }
  return <NoteWorkspace initial={noteQuery.data} defaultProjectId={defaultProjectId} search={search} />;
}

interface WorkspaceProps {
  initial: Note | null;
  defaultProjectId: string | null;
  search: string;
}

function NoteWorkspace({ initial, defaultProjectId, search }: WorkspaceProps) {
  const navigate = useNavigate();
  const editorRef = useRef<RichTextEditorHandle>(null);
  const { data: projects = [] } = useProjects();
  const { data: tagSuggestions = [] } = useTags();
  const upload = useUploadAttachments();
  const deleteAttachment = useDeleteAttachment();
  const deleteNote = useDeleteNote();
  const [editing, setEditing] = useState(!initial);
  const [progress, setProgress] = useState<number | null>(null);

  const doc = useNoteAutosave({
    initial,
    initialProjectId: defaultProjectId,
    onCreated: (id) => navigate(notesPath(id, search), { replace: true, state: { fromDraft: true } }),
  });

  const serverNote = useNote(doc.id ?? undefined).data ?? doc.saved;
  const attachments = serverNote?.attachments ?? [];
  const { values } = doc;

  const exitEdit = () => {
    void doc.flush();
    setEditing(false);
    if (doc.isDraft && !doc.hasContent) {
      doc.discard();
      navigate(notesPath(undefined, search), { replace: true });
    }
  };

  const exitRef = useRef(exitEdit);
  useEffect(() => {
    exitRef.current = exitEdit;
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void doc.flush();
        return;
      }
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      if (event.key === 'Escape' && editing) {
        exitRef.current();
      } else if (!editing && !event.ctrlKey && !event.metaKey && !event.altKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setEditing(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [doc, editing]);

  const uploadFiles = async (files: File[]) => {
    const ownerId = await doc.ensureCreated();
    setProgress(0);
    try {
      return await upload.mutateAsync({ owner: 'notes', ownerId, files, onProgress: setProgress });
    } finally {
      setProgress(null);
    }
  };

  const uploadImages = async (files: File[]): Promise<InlineImage[]> => (await uploadFiles(files)).map(toInlineImage);

  const items = attachments.map((attachment) => toAttachmentItem(attachment, values.body));

  const removeNote = async () => {
    if (!doc.id) return;
    doc.discard();
    await deleteNote.mutateAsync(doc.id);
    navigate(notesPath(undefined, search), { replace: true });
  };

  const attachmentError = upload.error ?? deleteAttachment.error;
  const project = projects.find((item) => item.id === values.projectId);

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-8 py-3">
        {editing ? (
          <ProjectSelect projects={projects} value={values.projectId} onChange={(projectId) => doc.change({ projectId }, true)} />
        ) : (
          <span className="inline-flex h-8 items-center gap-2 pr-1 text-xs font-medium text-fg-soft">
            <ProjectDot color={project?.color} />
            {project?.name ?? 'Sem projeto'}
          </span>
        )}
        <button
          type="button"
          aria-pressed={values.pinned}
          onClick={() => doc.change({ pinned: !values.pinned }, true)}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
            values.pinned ? 'bg-accent/15 text-accent-soft ring-1 ring-accent/25 ring-inset' : 'text-fg-muted hover:bg-raised hover:text-fg',
          )}
        >
          <Pin className="size-3.5" />
          {values.pinned ? 'Fixada' : 'Fixar'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {editing || doc.status !== 'saved' ? (
            <SaveIndicator status={doc.status} isDraft={doc.isDraft} onRetry={() => void doc.flush()} />
          ) : (
            serverNote && (
              <span className="text-2xs text-fg-subtle" title={formatDateTime(serverNote.updatedAt)}>
                Atualizada {formatRelative(serverNote.updatedAt)}
              </span>
            )
          )}
          {doc.id && (
            <HoldButton
              label="Segure 3 s para excluir a anotação"
              onConfirm={() => void removeNote()}
              disabled={deleteNote.isPending}
              className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-3.5" />
              Segure para excluir
            </HoldButton>
          )}
          {editing ? (
            <button
              type="button"
              onClick={exitEdit}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-raised px-3 text-xs font-medium text-fg ring-1 ring-line-strong ring-inset hover:bg-raised-hover"
            >
              <Check className="size-3.5" />
              Concluir
              <Kbd>Esc</Kbd>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-medium text-accent-fg shadow-sm shadow-black/20 hover:bg-accent-hover"
            >
              <Pencil className="size-3.5" />
              Editar
              <kbd className="rounded bg-accent-fg/15 px-1.5 text-2xs font-semibold">E</kbd>
            </button>
          )}
        </div>
      </header>

      {doc.status === 'conflict' && doc.conflict && (
        <div role="alert" className="flex shrink-0 items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-8 py-3">
          <GitCompareArrows className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-100">Esta anotação foi alterada em outra aba</p>
            <p className="mt-0.5 text-xs text-amber-200/80">
              A outra versão foi salva {formatRelative(doc.conflict.updatedAt)}. Suas últimas alterações ainda não foram salvas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => doc.resolveConflict('reload')}
            className="h-8 shrink-0 rounded-lg px-2.5 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
          >
            Descartar as minhas e recarregar
          </button>
          <button
            type="button"
            onClick={() => doc.resolveConflict('keep')}
            className="h-8 shrink-0 rounded-lg bg-amber-500/20 px-2.5 text-xs font-medium text-amber-50 ring-1 ring-amber-500/40 ring-inset hover:bg-amber-500/30"
          >
            Manter as minhas
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-8 pt-6 pb-4">
        {editing ? (
          <input
            aria-label="Título da anotação"
            value={values.title}
            autoFocus={doc.isDraft}
            maxLength={200}
            onChange={(event) => doc.change({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                editorRef.current?.focus();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                exitEdit();
              }
            }}
            placeholder="Título da anotação"
            className="w-full bg-transparent text-3xl font-semibold tracking-tight text-fg outline-none placeholder:text-fg-ghost"
          />
        ) : (
          <h1 className={cx('truncate text-3xl font-semibold tracking-tight', values.title ? 'text-fg' : 'text-fg-faint italic')}>
            {values.title || 'Sem título'}
          </h1>
        )}

        {editing ? (
          <div className="mt-3 shrink-0">
            <TagInput
              variant="inline"
              value={values.tags}
              onChange={(tags) => doc.change({ tags })}
              suggestions={tagSuggestions}
              onEscape={exitEdit}
            />
          </div>
        ) : (
          values.tags.length > 0 && (
            <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
              {values.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-raised px-2 py-0.5 text-xs text-fg-soft">
                  #{tag}
                </span>
              ))}
            </div>
          )
        )}

        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <LazyRichTextEditor
            key={doc.revision}
            ref={editorRef}
            fill
            value={values.body}
            editable={editing}
            onChange={(body) => doc.change({ body })}
            ariaLabel="Texto da anotação"
            placeholder="Escreva aqui… ou digite / para inserir título, lista, tabela ou bloco de código"
            readOnlyPlaceholder="Nada escrito ainda. Pressione E para escrever."
            uploadImages={uploadImages}
            onRequestEdit={() => setEditing(true)}
            onEscape={exitEdit}
            footer={
              (editing || items.length > 0) && (
                <AttachmentPanel
                  variant="strip"
                  items={items}
                  progress={progress}
                  error={attachmentError ? errorMessage(attachmentError) : null}
                  note={editing ? 'Ctrl+V dentro do texto insere a imagem ali · fora do texto só anexa' : undefined}
                  onFiles={editing ? (files) => void uploadFiles(files).catch(() => undefined) : undefined}
                  onInsert={editing ? (item) => item.src && editorRef.current?.insertImage({ src: item.src, alt: item.name }) : undefined}
                  onRemove={
                    editing && doc.id
                      ? (attachmentId) => {
                          editorRef.current?.removeImages(api.attachments.contentUrl(attachmentId));
                          deleteAttachment.mutate({ id: attachmentId, owner: 'notes', ownerId: doc.id! });
                        }
                      : undefined
                  }
                />
              )
            }
          />
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-2 text-2xs text-fg-faint">
          <span>
            {serverNote
              ? `Criada ${formatDateTime(serverNote.createdAt)} · Atualizada ${formatDateTime(serverNote.updatedAt)}`
              : 'Ainda não salva'}
          </span>
          <span>
            {editing ? (
              <>
                Digite <b className="font-semibold text-fg-subtle">/</b> para inserir blocos · atalhos de Markdown também funcionam · Esc
                conclui · Ctrl+S salva na hora
              </>
            ) : (
              <>
                <b className="font-semibold text-fg-subtle">E</b> ou dois cliques no texto para editar · caixas de tarefa podem ser
                marcadas sem editar
              </>
            )}
          </span>
        </div>
      </div>
    </>
  );
}

function ProjectSelect({ projects, value, onChange }: { projects: Project[]; value: string | null; onChange: (id: string | null) => void }) {
  return (
    <label className="relative flex h-8 items-center gap-2 rounded-lg bg-surface pr-7 pl-2.5 text-xs ring-1 ring-line ring-inset hover:ring-line-strong">
      <ProjectDot color={projects.find((project) => project.id === value)?.color} />
      <select
        aria-label="Projeto da anotação"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        className="appearance-none bg-transparent font-medium text-fg-soft outline-none"
      >
        <option value="">Sem projeto</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-fg-faint" />
    </label>
  );
}

function SaveIndicator({ status, isDraft, onRetry }: { status: SaveStatus; isDraft: boolean; onRetry: () => void }) {
  if (status === 'conflict') {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-amber-200">
        <CircleAlert className="size-3.5 text-amber-300" />
        Não salvo: conflito
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-rose-300">
        <CloudOff className="size-3.5 text-rose-400" />
        Não foi possível salvar
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded px-1.5 py-0.5 font-medium text-fg-soft ring-1 ring-line-strong ring-inset hover:bg-raised"
        >
          Tentar de novo
        </button>
      </span>
    );
  }
  if (status === 'saving' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
        <Spinner className="size-3.5" />
        Salvando…
      </span>
    );
  }
  if (isDraft) {
    return (
      <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
        <FilePenLine className="size-3.5" />
        Rascunho · salva quando tiver conteúdo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-fg-subtle">
      <Check className="size-3.5 text-emerald-400" />
      Salvo
    </span>
  );
}
