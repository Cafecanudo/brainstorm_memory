import { Pin, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { NoteSummary } from '../../api/types';
import { ProjectDot } from '../../components/ProjectDot';
import { ButtonLink, Kbd, Spinner, cx, inputClass } from '../../components/ui';
import { formatDateTime, formatRelative, stripMarkdown } from '../../lib/format';
import { NEW_NOTE, notesPath } from '../../lib/routes';

interface NoteListProps {
  title: string;
  notes: NoteSummary[];
  loading: boolean;
  fetching: boolean;
  selectedId?: string;
  search: string;
  query: string;
  onQueryChange: (query: string | undefined) => void;
}

export function NoteList({ title, notes, loading, fetching, selectedId, search, query, onQueryChange }: NoteListProps) {
  const [draft, setDraft] = useState(query);

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const value = draft.trim() || undefined;
      if (value !== (query || undefined)) onQueryChange(value);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, query, onQueryChange]);

  const pinned = notes.filter((note) => note.pinned);
  const others = notes.filter((note) => !note.pinned);

  const group = (label: string | null, items: NoteSummary[]) =>
    items.length > 0 && (
      <div>
        {label && <p className="px-3 pt-3 pb-1 text-2xs font-medium tracking-wider text-fg-subtle uppercase">{label}</p>}
        <ul className="space-y-0.5">
          {items.map((note) => (
            <li key={note.id}>
              <NoteListItem note={note} active={note.id === selectedId} href={notesPath(note.id, search)} />
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section aria-label="Lista de anotações" className="flex w-[22rem] shrink-0 flex-col border-r border-line">
      <header className="space-y-4 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
              {fetching && <Spinner className="size-3.5 text-fg-faint" />}
            </div>
            <p className="text-sm text-fg-subtle">
              {notes.length} {notes.length === 1 ? 'anotação' : 'anotações'}
            </p>
          </div>
          <ButtonLink to={notesPath(NEW_NOTE, search)} variant="primary" size="sm" title="Nova anotação (N)">
            <Plus />
            Nova
            <Kbd>N</Kbd>
          </ButtonLink>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Buscar em título, texto e tags"
            className={cx(inputClass, 'pl-9')}
          />
        </div>
      </header>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6">
        {loading ? (
          <div className="grid place-items-center py-10 text-fg-faint">
            <Spinner />
          </div>
        ) : notes.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-fg-faint">
            {query ? 'Nada encontrado para essa busca.' : 'Nenhuma anotação aqui ainda.'}
          </p>
        ) : (
          <>
            {group(pinned.length ? 'Fixadas' : null, pinned)}
            {group(pinned.length ? 'Demais' : null, others)}
          </>
        )}
      </nav>
    </section>
  );
}

function NoteListItem({ note, active, href }: { note: NoteSummary; active: boolean; href: string }) {
  const excerpt = stripMarkdown(note.excerpt);
  return (
    <Link
      to={href}
      aria-current={active ? 'page' : undefined}
      className={cx('block rounded-lg px-3 py-2.5 transition-colors', active ? 'bg-raised' : 'hover:bg-surface')}
    >
      <span className="flex items-center gap-1.5 text-2xs text-fg-subtle">
        <ProjectDot color={note.projectColor} size="sm" />
        <span className="truncate">{note.projectName ?? 'Sem projeto'}</span>
        <span className="text-fg-ghost">·</span>
        <span className="shrink-0" title={formatDateTime(note.updatedAt)}>
          {formatRelative(note.updatedAt)}
        </span>
        {note.pinned && <Pin aria-label="Fixada" className="ml-auto size-3 shrink-0 text-accent-soft" />}
      </span>
      <span className={cx('mt-1 block truncate text-sm font-medium', note.title ? 'text-fg' : 'text-fg-faint italic')}>
        {note.title || 'Sem título'}
      </span>
      {excerpt && <span className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{excerpt}</span>}
    </Link>
  );
}
