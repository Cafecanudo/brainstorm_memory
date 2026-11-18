import { ArrowLeft, Flag, Save } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { IdeaInput, Project } from '../../api/types';
import { Button, Field, Kbd, Spinner, cx, inputClass } from '../../components/ui';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/constants';
import { errorMessage } from '../../lib/format';
import { projectIdeasPath } from '../../lib/routes';
import { MarkdownEditor } from './MarkdownEditor';
import { TagInput } from './TagInput';

interface IdeaFormProps {
  initial: IdeaInput;
  projects: Project[];
  tagSuggestions: string[];
  submitLabel: string;
  submitting: boolean;
  error?: unknown;
  forceDirty?: boolean;
  previewFirst?: boolean;
  headerActions?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
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
  previewFirst = false,
  headerActions,
  meta,
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
          <MarkdownEditor
            value={values.description}
            onChange={(description) => set('description', description)}
            defaultMode={previewFirst ? 'preview' : 'write'}
          />
          {children}
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
            <div className="grid grid-cols-2 gap-1.5">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set('status', option.value)}
                  className={cx(
                    'rounded-lg px-2 py-1.5 text-xs font-medium ring-1 ring-inset transition',
                    values.status === option.value
                      ? option.className
                      : 'text-fg-subtle ring-line hover:text-fg-soft hover:ring-line-strong',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Prioridade">
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set('priority', option.value)}
                  className={cx(
                    'flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ring-1 ring-inset transition',
                    values.priority === option.value
                      ? cx('bg-raised ring-fg-faint', option.className)
                      : 'text-fg-subtle ring-line hover:text-fg-soft hover:ring-line-strong',
                  )}
                >
                  <Flag className="size-3" />
                  {option.label}
                </button>
              ))}
            </div>
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
