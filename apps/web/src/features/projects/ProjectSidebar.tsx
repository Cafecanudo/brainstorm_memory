import { Check, Layers, Lightbulb, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from '../../api/hooks';
import type { Project, ProjectInput } from '../../api/types';
import { cx } from '../../components/ui';
import { PROJECT_COLORS } from '../../lib/constants';
import { errorMessage } from '../../lib/format';
import { projectIdeasPath } from '../../lib/routes';

export function ProjectSidebar() {
  const { data: projects = [], isPending } = useProjects();
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const onList = pathname === '/';
  const activeId = onList ? params.get('project') : null;
  const openTotal = projects.reduce((sum, project) => sum + project.openCount, 0);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-sunken">
      <Link to="/" className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-inset ring-accent/20">
          <Lightbulb className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Brainstorm</span>
      </Link>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3">
        <SidebarLink to="/" active={onList && !activeId} count={openTotal}>
          <Layers className="size-4 shrink-0 text-fg-subtle" />
          Todas as ideias
        </SidebarLink>

        <p className="mt-6 mb-1.5 px-2 text-2xs font-medium uppercase tracking-wider text-fg-subtle">Projetos</p>
        <div className="space-y-0.5">
          {projects.map((project) => (
            <ProjectItem key={project.id} project={project} active={project.id === activeId} />
          ))}
        </div>
        {!isPending && projects.length === 0 && (
          <p className="px-2 py-1 text-sm text-fg-faint">Nenhum projeto ainda.</p>
        )}
      </nav>

      <div className="border-t border-line p-3">
        <NewProject nextColor={PROJECT_COLORS[projects.length % PROJECT_COLORS.length]!} />
      </div>
    </aside>
  );
}

function SidebarLink({ to, active, count, children }: { to: string; active: boolean; count?: number; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={cx(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg',
      )}
    >
      {children}
      {count ? <span className="ml-auto text-xs tabular-nums text-fg-subtle">{count}</span> : null}
    </Link>
  );
}

function ProjectItem({ project, active }: { project: Project; active: boolean }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const navigate = useNavigate();

  if (editing) {
    return (
      <ProjectForm
        initial={{ name: project.name, color: project.color }}
        pending={update.isPending}
        error={update.error}
        onCancel={() => setEditing(false)}
        onSubmit={async (input) => {
          await update.mutateAsync({ id: project.id, input });
          setEditing(false);
        }}
      />
    );
  }

  const handleDelete = async () => {
    const message = project.ideaCount
      ? `Excluir "${project.name}" e suas ${project.ideaCount} ideia(s)? Os anexos também serão apagados. Essa ação não pode ser desfeita.`
      : `Excluir o projeto "${project.name}"?`;
    if (!window.confirm(message)) return;
    await remove.mutateAsync(project.id);
    if (active) navigate('/');
  };

  return (
    <div
      className={cx(
        'group flex items-center rounded-md transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-muted hover:bg-surface hover:text-fg',
      )}
    >
      <Link to={projectIdeasPath(project.id)} className="flex min-w-0 flex-1 items-center gap-2.5 px-2 py-1.5 text-sm">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
        <span className="truncate">{project.name}</span>
        <span className="ml-auto text-xs tabular-nums text-fg-subtle group-hover:hidden">{project.openCount || ''}</span>
      </Link>
      <div className="hidden shrink-0 items-center pr-1 group-hover:flex">
        <button
          type="button"
          title="Renomear"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-fg-subtle hover:text-fg"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          title="Excluir"
          onClick={handleDelete}
          disabled={remove.isPending}
          className="rounded p-1 text-fg-subtle hover:text-rose-400"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function NewProject({ nextColor }: { nextColor: string }) {
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
        navigate(projectIdeasPath(project.id));
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
      <div className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 ring-1 ring-inset ring-line-strong focus-within:ring-accent">
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
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="text-fg-muted hover:text-accent-soft disabled:opacity-40"
        >
          <Check className="size-4" />
        </button>
      </div>
      {message && <p className="px-1 text-xs text-rose-400">{message}</p>}
      <p className="px-1 text-2xs text-fg-faint">Enter salva · Esc cancela · clique na cor para trocar</p>
    </form>
  );
}
