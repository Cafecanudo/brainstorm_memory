import { Flag, FolderPlus, LayoutGrid, Lightbulb, List, Plus, Search, SearchX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useIdeas, useProjects, useTags } from '../../api/hooks';
import type { IdeaPriority, IdeaStatus } from '../../api/types';
import {
  ButtonLink,
  EmptyState,
  Kbd,
  PageSpinner,
  SegmentedControl,
  Spinner,
  cx,
  inputClass,
  type SegmentOption,
} from '../../components/ui';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/constants';
import { isTypingTarget, partitionFiles, usePasteFiles } from '../../lib/files';
import { IdeaCard } from './IdeaCard';
import { IdeaList } from './IdeaList';
import { useViewMode, type ViewMode } from './useViewMode';

const STATUS_VALUES = new Set<string>(STATUS_OPTIONS.map((option) => option.value));
const PRIORITY_VALUES = new Set<string>(PRIORITY_OPTIONS.map((option) => option.value));

const STATUS_SEGMENTS: SegmentOption<IdeaStatus>[] = [
  { value: undefined, label: 'Todas' },
  ...STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
];

const PRIORITY_SEGMENTS: SegmentOption<IdeaPriority>[] = [
  { value: undefined, label: 'Qualquer', title: 'Qualquer prioridade' },
  ...PRIORITY_OPTIONS.map((option) => ({
    value: option.value,
    title: `Prioridade ${option.label.toLowerCase()}`,
    label: (
      <>
        <Flag className={option.className} />
        {option.label}
      </>
    ),
  })),
];

const VIEW_SEGMENTS: SegmentOption<ViewMode>[] = [
  { value: 'grid', label: <LayoutGrid />, title: 'Visualizar em cards' },
  { value: 'list', label: <List />, title: 'Visualizar em lista' },
];

export function IdeasPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = params.get('project') ?? undefined;
  const rawStatus = params.get('status');
  const status = rawStatus && STATUS_VALUES.has(rawStatus) ? (rawStatus as IdeaStatus) : undefined;
  const rawPriority = params.get('priority');
  const priority = rawPriority && PRIORITY_VALUES.has(rawPriority) ? (rawPriority as IdeaPriority) : undefined;
  const tag = params.get('tag') ?? undefined;
  const q = params.get('q') ?? undefined;
  const [viewMode, setViewMode] = useViewMode();

  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const { data: tags = [] } = useTags();
  const ideasQuery = useIdeas({ projectId, status, priority, tag, q });
  const project = projects.find((item) => item.id === projectId);
  const hasProjects = projects.length > 0;
  const newIdeaPath = `/ideas/new${projectId ? `?project=${projectId}` : ''}`;

  const [search, setSearch] = useState(q ?? '');

  const setParam = (key: string, value: string | undefined) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    setSearch(new URLSearchParams(window.location.search).get('q') ?? '');
  }, [projectId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const value = search.trim() || undefined;
      if (value !== (new URLSearchParams(window.location.search).get('q') ?? undefined)) setParam('q', value);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  usePasteFiles((files) => {
    const { accepted } = partitionFiles(files);
    if (accepted.length) navigate(newIdeaPath, { state: { files: accepted } });
  }, hasProjects);

  useEffect(() => {
    if (!hasProjects) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      navigate(newIdeaPath);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasProjects, newIdeaPath, navigate]);

  if (projectsQuery.isPending) return <PageSpinner />;

  const ideas = ideasQuery.data ?? [];
  const filtered = Boolean(status || priority || tag || q);

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {project && <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />}
            <h1 className="truncate text-2xl font-semibold tracking-tight">{project?.name ?? 'Todas as ideias'}</h1>
            {ideasQuery.isFetching && <Spinner className="size-4 text-fg-faint" />}
          </div>
          <p className="mt-1 text-sm text-fg-subtle">
            {ideas.length} {ideas.length === 1 ? 'ideia' : 'ideias'}
            {filtered && ' com os filtros atuais'}
          </p>
        </div>
        <SegmentedControl
          label="Modo de visualização"
          options={VIEW_SEGMENTS}
          value={viewMode}
          onChange={(value) => value && setViewMode(value)}
        />
        <ButtonLink to={newIdeaPath} variant="primary" disabled={!hasProjects}>
          <Plus />
          Nova ideia
          <Kbd>N</Kbd>
        </ButtonLink>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar no título e descrição"
            className={cx(inputClass, 'pl-9')}
          />
        </div>
        <SegmentedControl label="Status" options={STATUS_SEGMENTS} value={status} onChange={(value) => setParam('status', value)} />
        <SegmentedControl
          label="Prioridade"
          options={PRIORITY_SEGMENTS}
          value={priority}
          onChange={(value) => setParam('priority', value)}
        />
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {tags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setParam('tag', item === tag ? undefined : item)}
              className={cx(
                'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs transition-colors',
                item === tag
                  ? 'bg-accent/20 text-accent-soft ring-1 ring-inset ring-accent/40'
                  : 'bg-surface text-fg-muted ring-1 ring-inset ring-line hover:text-fg-soft',
              )}
            >
              #{item}
              {item === tag && <X className="size-3" />}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {!hasProjects ? (
          <EmptyState
            icon={<FolderPlus />}
            title="Crie seu primeiro projeto"
            description="Use “Novo projeto” na barra lateral. As ideias são organizadas por projeto."
          />
        ) : ideasQuery.isPending ? (
          <PageSpinner />
        ) : ideas.length === 0 ? (
          filtered ? (
            <EmptyState icon={<SearchX />} title="Nada encontrado" description="Ajuste a busca ou os filtros." />
          ) : (
            <EmptyState
              icon={<Lightbulb />}
              title="Nenhuma ideia aqui ainda"
              description={
                <>
                  Pressione <Kbd>N</Kbd> para registrar uma ideia, ou cole um print com <Kbd>Ctrl V</Kbd> em qualquer lugar
                  desta tela.
                </>
              }
            />
          )
        ) : viewMode === 'list' ? (
          <IdeaList ideas={ideas} showProject={!projectId} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} showProject={!projectId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
