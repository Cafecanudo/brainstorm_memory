import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { useNavigate } from 'react-router';
import type { IdeaInput, Project } from '../../api/types';
import { Button, Field, Kbd, Spinner, cx, inputClass } from '../../components/ui';
import { errorMessage } from '../../lib/format';
import { projectIdeasPath } from '../../lib/routes';
import { TagInput } from '../../components/TagInput';
import { LazyRichTextEditor } from '../../components/rich-text/LazyRichTextEditor';
import type { InlineImage, RichTextEditorHandle } from '../../components/rich-text/types';
import { PriorityPicker, StatusPicker } from './IdeaPickers';

interface IdeaFormProps {
  initial: IdeaInput;
  projects: Project[];
  tagSuggestions: string[];
  submitLabel: string;
  submitting: boolean;
  error?: unknown;
  forceDirty?: boolean;
  headerActions?: ReactNode;
  meta?: ReactNode;
  editorRef?: Ref<RichTextEditorHandle>;
  backTo?: string;
  uploadImages?: (files: File[]) => Promise<InlineImage[]>;
  children?: (state: { description: string }) => ReactNode;
  onSubmit: (values: IdeaInput) => Promise<void>;
}

const sameValues = (a: IdeaInput, b: IdeaInput) => JSON.stringify(a) === JSON.stringify(b);

export function IdeaForm({
  initial,
  projects,
  tagSuggestions,
  submitLabel,
  submitting,
  error,
  forceDirty = false,
  headerActions,
  meta,
  editorRef,
  backTo,
  uploadImages,
  children,
  onSubmit,
}: IdeaFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const dirty = forceDirty || !sameValues(values, baseline);
  const valid = values.title.trim().length > 0 && Boolean(values.projectId);
  const canSubmit = valid && dirty && !submitting;

  const set = <K extends keyof IdeaInput>(key: K, value: IdeaInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!canSubmit) return;
    const snapshot = { ...values, title: values.title.trim() };
    try {
      await onSubmit(snapshot);
      setBaseline(snapshot);
      setValues(snapshot);
    } catch {
      return;
    }
  };

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void submitRef.current();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handleUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [dirty]);

  const goBack = () => {
    if (backTo) {
      navigate(backTo, { replace: true });
      return;
    }
    const historyIndex = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (historyIndex > 0) navigate(-1);
    else navigate(projectIdeasPath(baseline.projectId));
  };

  return (
    <form
      className="mx-auto max-w-6xl px-8 py-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft />
          Voltar
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="mr-1 text-xs text-amber-400/80">Alterações não salvas</span>}
          {headerActions}
          <Button type="submit" variant="primary" disabled={!canSubmit}>
            {submitting ? <Spinner /> : <Save />}
            {submitLabel}
            <Kbd>Ctrl S</Kbd>
          </Button>
        </div>
      </div>

      {Boolean(error) && (
        <div className="mb-6 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage(error)}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-6">
          <textarea
            rows={1}
            value={values.title}
            autoFocus={!initial.title}
            maxLength={200}
            onChange={(event) => set('title', event.target.value.replace(/\n/g, ' '))}
            onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()}
            placeholder="Título da ideia"
            className="field-sizing-content block w-full resize-none bg-transparent text-3xl leading-tight font-semibold tracking-tight text-fg outline-none placeholder:text-fg-ghost"
          />
          <LazyRichTextEditor
            ref={editorRef}
            value={initial.description}
            onChange={(description) => set('description', description)}
            editable
            ariaLabel="Descrição da ideia"
            placeholder="Contexto, problema, abordagem, links… Digite / para inserir blocos. Print colado aqui entra no texto."
            uploadImages={uploadImages}
          />
          {children?.({ description: values.description })}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Field label="Projeto">
            <select
              value={values.projectId}
              onChange={(event) => set('projectId', event.target.value)}
              className={cx(inputClass, 'cursor-pointer')}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <StatusPicker value={values.status} onChange={(status) => set('status', status)} />
          </Field>

          <Field label="Prioridade">
            <PriorityPicker value={values.priority} onChange={(priority) => set('priority', priority)} />
          </Field>

          <Field label="Tags">
            <TagInput value={values.tags} onChange={(tags) => set('tags', tags)} suggestions={tagSuggestions} />
          </Field>

          {meta}
        </aside>
      </div>
    </form>
  );
}
