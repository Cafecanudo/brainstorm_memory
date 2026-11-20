import { Check, Layers, Lightbulb, NotebookPen, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useCreateProject, useDeleteProject, useNoteCounts, useProjects, useUpdateProject } from '../../api/hooks';
import { UNASSIGNED_PROJECT, type Project, type ProjectInput } from '../../api/types';
import { HoldButton } from '../../components/HoldButton';
import { ProjectDot } from '../../components/ProjectDot';
import { cx } from '../../components/ui';
import { PROJECT_COLORS } from '../../lib/constants';
import { errorMessage } from '../../lib/format';
import { notesPath, projectIdeasPath, projectNotesPath } from '../../lib/routes';

type Section = 'ideas' | 'notes';

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function ProjectSidebar() {
  const { data: projects = [], isPending } = useProjects();
  const { data: noteCounts } = useNoteCounts();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const section: Section = pathname.startsWith('/notes') ? 'notes' : 'ideas';
  const onIdeasList = pathname === '/';
  const projectFilter = section === 'notes' || onIdeasList ? params.get('project') : null;
  const openTotal = projects.reduce((sum, project) => sum + project.openCount, 0);

  const projectHref = (id: string) => (section === 'notes' ? projectNotesPath(id) : projectIdeasPath(id));
  const projectCount = (project: Project) => (section === 'notes' ? project.noteCount : project.openCount);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-sunken">
      <Link to="/" className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/20 ring-inset">
          <Lightbulb className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Brainstorm</span>
      </Link>

      <nav aria-label="Navegação" className="scrollbar-thin flex-1 overflow-y-auto px-3">
        <div className="space-y-0.5">
          <SidebarLink to="/" active={section === 'ideas'} count={openTotal}>
            <Layers className="size-4 shrink-0 text-fg-subtle" />
            Ideias
          </SidebarLink>
          <SidebarLink to={notesPath()} active={section === 'notes'} count={noteCounts?.total}>
            <NotebookPen className="size-4 shrink-0 text-fg-subtle" />
            Anotações
          </SidebarLink>
        </div>

        <p className="mt-6 mb-1.5 px-2 text-2xs font-medium tracking-wider text-fg-subtle uppercase">Projetos</p>
        <div className="space-y-0.5">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              href={projectHref(project.id)}
              count={projectCount(project)}
              active={project.id === projectFilter}
            />
          ))}
          {section === 'notes' && (
            <SidebarLink to={projectNotesPath(UNASSIGNED_PROJECT)} active={projectFilter === UNASSIGNED_PROJECT} count={noteCounts?.unassigned}>
              <ProjectDot color={null} />
              Sem projeto
            </SidebarLink>
          )}
        </div>
        {!isPending && projects.length === 0 && <p className="px-2 py-1 text-sm text-fg-faint">Nenhum projeto ainda.</p>}
      </nav>

      <div className="border-t border-line p-3">
        <NewProject nextColor={PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!} section={section} />
      </div>
    </aside>
  );
}

function SidebarLink({ to, active, count, children }: { to: string; active: boolean; count?: number; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg',
      )}
    >
      {children}
      {count ? <span className="ml-auto text-xs text-fg-subtle tabular-nums">{count}</span> : null}
    </Link>
  );
}

function ProjectItem({ project, href, count, active }: { project: Project; href: string; count: number; active: boolean }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const update = useUpdateProject();

  if (mode === 'edit') {
    return (
      <ProjectForm
        initial={{ name: project.name, color: project.color }}
        pending={update.isPending}
        error={update.error}
        onCancel={() => setMode('view')}
        onSubmit={async (input) => {
          await update.mutateAsync({ id: project.id, input });
          setMode('view');
        }}
      />
    );
  }

  return (
    <div>
      <div
        className={cx(
          'group flex items-center rounded-md transition-colors',
          active ? 'bg-raised text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg',
        )}
      >
        <Link to={href} aria-current={active ? 'page' : undefined} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-sm">
          <ProjectDot color={project.color} />
          <span className="truncate">{project.name}</span>
          <span className="ml-auto text-xs text-fg-subtle tabular-nums group-hover:hidden">{count || ''}</span>
        </Link>
        <div className="hidden shrink-0 items-center pr-1 group-hover:flex">
          <button type="button" title="Renomear" onClick={() => setMode('edit')} className="rounded p-1 text-fg-subtle hover:text-fg">
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            title="Excluir"
            onClick={() => setMode(mode === 'delete' ? 'view' : 'delete')}
            className="rounded p-1 text-fg-subtle hover:text-rose-400"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {mode === 'delete' && <DeleteProjectCard project={project} active={active} onCancel={() => setMode('view')} />}
    </div>
  );
}

function DeleteProjectCard({ project, active, onCancel }: { project: Project; active: boolean; onCancel: () => void }) {
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const confirm = async () => {
    await remove.mutateAsync(project.id);
    if (active) navigate(pathname.startsWith('/notes') ? notesPath() : '/');
  };

  return (
    <div role="dialog" aria-label={`Excluir ${project.name}`} className="my-1.5 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
      <p className="text-sm font-medium text-fg">Excluir “{project.name}”?</p>
      <p className="mt-1.5 text-xs text-fg-muted">Serão apagados junto:</p>
      <ul className="mt-1 space-y-0.5 text-xs text-fg-soft">
        <li className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-fg-subtle" />
          {plural(project.ideaCount, 'ideia', 'ideias')}
        </li>
        <li className="flex items-center gap-1.5">
          <NotebookPen className="size-3.5 text-fg-subtle" />
          {plural(project.noteCount, 'anotação', 'anotações')}
        </li>
        <li className="flex items-center gap-1.5 pl-5 text-fg-muted">{plural(project.attachmentCount, 'anexo', 'anexos')} no total</li>
      </ul>
      <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-rose-300">
        <TriangleAlert className="mt-px size-3.5 shrink-0" />
        Não é possível recuperar depois.
      </p>
      {remove.error && <p className="mt-2 text-xs text-rose-400">{errorMessage(remove.error)}</p>}
      <div className="mt-3 space-y-1">
        <HoldButton
          label={`Segure 3 s para excluir ${project.name}`}
          onConfirm={() => void confirm()}
          disabled={remove.isPending}
          className="flex h-8 w-full items-center justify-center rounded-lg bg-rose-500/15 px-2.5 text-xs font-medium whitespace-nowrap text-rose-300 ring-1 ring-rose-500/30 ring-inset hover:bg-rose-500/20"
        >
          <Trash2 className="size-3.5" />
          Segure 3 s para excluir
        </HoldButton>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 w-full rounded-lg text-xs font-medium text-fg-muted hover:bg-raised hover:text-fg"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function NewProject({ nextColor, section }: { nextColor: string; section: Section }) {
  const [open, setOpen] = useState(false);
  const create = useCreateProject();
  const navigate = useNavigate();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg"
      >
        <Plus className="size-4" />
        Novo projeto
      </button>
    );
  }

  return (
    <ProjectForm
      initial={{ name: '', color: nextColor }}
      pending={create.isPending}
      error={create.error}
      onCancel={() => {
        create.reset();
        setOpen(false);
      }}
      onSubmit={async (input) => {
        const project = await create.mutateAsync(input);
        setOpen(false);
        navigate(section === 'notes' ? projectNotesPath(project.id) : projectIdeasPath(project.id));
      }}
    />
  );
}

interface ProjectFormProps {
  initial: ProjectInput;
  pending: boolean;
  error: unknown;
  onSubmit: (input: ProjectInput) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ initial, pending, error, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);

  const cycleColor = () =>
    setColor((current) => PROJECT_COLORS[(PROJECT_COLORS.indexOf(current) + 1) % PROJECT_COLORS.length]!);

  const message =
    error instanceof ApiError && error.status === 409 ? 'Já existe um projeto com esse nome' : error ? errorMessage(error) : null;

  return (
    <form
      className="space-y-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim()) onSubmit({ name: name.trim(), color }).catch(() => undefined);
      }}
    >
      <div className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 ring-1 ring-line-strong ring-inset focus-within:ring-accent">
        <button
          type="button"
          title="Trocar cor"
          onClick={cycleColor}
          className="size-3 shrink-0 rounded-full transition-transform hover:scale-125"
          style={{ backgroundColor: color }}
        />
        <input
          autoFocus
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && onCancel()}
          placeholder="Nome do projeto"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-faint"
        />
        <button type="submit" disabled={pending || !name.trim()} className="text-fg-muted hover:text-accent-soft disabled:opacity-40">
          <Check className="size-4" />
        </button>
      </div>
      {message && <p className="px-1 text-xs text-rose-400">{message}</p>}
      <p className="px-1 text-2xs text-fg-faint">Enter salva · Esc cancela · clique na cor para trocar</p>
    </form>
  );
}
