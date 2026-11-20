import { NotebookPen } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useNotes, useProjects } from '../../api/hooks';
import { UNASSIGNED_PROJECT } from '../../api/types';
import { EmptyState, Kbd } from '../../components/ui';
import { isTypingTarget } from '../../lib/files';
import { NEW_NOTE, notesPath } from '../../lib/routes';
import { NoteDetail } from './NoteDetail';
import { NoteList } from './NoteList';

export function NotesPage() {
  const { noteId } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const projectFilter = params.get('project') ?? undefined;
  const query = params.get('q') ?? '';
  const search = params.toString();

  const { data: projects = [] } = useProjects();
  const notesQuery = useNotes({ projectId: projectFilter, q: query || undefined });
  const notes = notesQuery.data ?? [];
  const firstId = notes[0]?.id;

  const project = projects.find((item) => item.id === projectFilter);
  const title = projectFilter === UNASSIGNED_PROJECT ? 'Sem projeto' : (project?.name ?? 'Todas as anotações');
  const defaultProjectId = projectFilter && projectFilter !== UNASSIGNED_PROJECT ? projectFilter : null;

  const sessionRef = useRef(noteId ?? '');
  const fromDraft = Boolean((location.state as { fromDraft?: boolean } | null)?.fromDraft);
  if (!(fromDraft && sessionRef.current === NEW_NOTE)) sessionRef.current = noteId ?? '';

  useEffect(() => {
    if (noteId || notesQuery.isPending || notesQuery.isPlaceholderData || !firstId) return;
    navigate(notesPath(firstId, search), { replace: true });
  }, [noteId, firstId, notesQuery.isPending, notesQuery.isPlaceholderData, navigate, search]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      event.preventDefault();
      navigate(notesPath(NEW_NOTE, search));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate, search]);

  const onQueryChange = useCallback(
    (value: string | undefined) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set('q', value);
          else next.delete('q');
          return next;
        },
        { replace: true, state: location.state },
      ),
    [setParams, location.state],
  );

  return (
    <div className="flex h-full min-h-0">
      <NoteList
        title={title}
        notes={notes}
        loading={notesQuery.isPending}
        fetching={notesQuery.isFetching && !notesQuery.isPending}
        selectedId={noteId}
        search={search}
        query={query}
        onQueryChange={onQueryChange}
      />
      <section aria-label="Anotação" className="flex min-w-0 flex-1 flex-col">
        {noteId ? (
          <NoteDetail key={sessionRef.current} noteId={noteId} defaultProjectId={defaultProjectId} search={search} />
        ) : (
          !notesQuery.isPending &&
          notes.length === 0 && (
            <div className="grid flex-1 place-items-center p-8">
              <EmptyState
                icon={<NotebookPen />}
                title="Nenhuma anotação aberta"
                description={
                  <>
                    Pressione <Kbd>N</Kbd> para criar uma anotação.
                  </>
                }
              />
            </div>
          )
        )}
      </section>
    </div>
  );
}
