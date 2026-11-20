import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, api } from '../../api/client';
import { queryKeys, useInvalidateNotes } from '../../api/hooks';
import type { NoteDetail, NoteInput } from '../../api/types';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict';

const SAVE_DELAY_MS = 700;

const sameValues = (a: NoteInput, b: NoteInput) => JSON.stringify(a) === JSON.stringify(b);

const hasContent = (values: NoteInput) => Boolean(values.title.trim() || values.body.trim() || values.tags.length);

export const toNoteInput = (note: NoteDetail): NoteInput => ({
  projectId: note.projectId,
  title: note.title,
  body: note.body,
  tags: note.tags,
  pinned: note.pinned,
});

interface Options {
  initial: NoteDetail | null;
  initialProjectId: string | null;
  onCreated: (id: string) => void;
}

export function useNoteAutosave({ initial, initialProjectId, onCreated }: Options) {
  const queryClient = useQueryClient();
  const invalidateNotes = useInvalidateNotes();
  const emptyDraft: NoteInput = { projectId: initialProjectId, title: '', body: '', tags: [], pinned: false };
  const [values, setValues] = useState<NoteInput>(() => (initial ? toNoteInput(initial) : emptyDraft));
  const [status, setStatusState] = useState<SaveStatus>('saved');
  const [conflict, setConflict] = useState<NoteDetail | null>(null);
  const [saved, setSaved] = useState<NoteDetail | null>(initial);
  const [revision, setRevision] = useState(0);

  const valuesRef = useRef(values);
  const savedValuesRef = useRef<NoteInput | null>(initial ? toNoteInput(initial) : null);
  const idRef = useRef<string | null>(initial?.id ?? null);
  const versionRef = useRef(initial?.version ?? 0);
  const statusRef = useRef<SaveStatus>('saved');
  const timer = useRef<number | undefined>(undefined);
  const inflight = useRef<Promise<void> | null>(null);
  const onCreatedRef = useRef(onCreated);
  const invalidateRef = useRef(invalidateNotes);
  const disposed = useRef(false);

  useEffect(() => {
    onCreatedRef.current = onCreated;
    invalidateRef.current = invalidateNotes;
  });

  const setStatus = useCallback((next: SaveStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const persist = useCallback(
    async (force = false): Promise<void> => {
      while (inflight.current) await inflight.current;
      if (statusRef.current === 'conflict' || disposed.current) return;

      const snapshot = valuesRef.current;
      const unchanged = savedValuesRef.current && sameValues(snapshot, savedValuesRef.current);
      if (unchanged || (!idRef.current && !hasContent(snapshot) && !force)) {
        if (statusRef.current !== 'error') setStatus('saved');
        return;
      }

      const run = (async () => {
        setStatus('saving');
        try {
          const created = !idRef.current;
          const note = idRef.current
            ? await api.notes.update(idRef.current, versionRef.current, snapshot)
            : await api.notes.create(snapshot);
          idRef.current = note.id;
          versionRef.current = note.version;
          savedValuesRef.current = snapshot;
          queryClient.setQueryData(queryKeys.note(note.id), note);
          setSaved(note);
          setStatus(sameValues(valuesRef.current, snapshot) ? 'saved' : 'pending');
          void invalidateRef.current();
          if (created) onCreatedRef.current(note.id);
        } catch (error) {
          if (error instanceof ApiError && error.status === 412) {
            const current = (error.details as { current?: NoteDetail } | undefined)?.current ?? null;
            setConflict(current);
            setStatus('conflict');
          } else {
            setStatus('error');
          }
        }
      })();

      inflight.current = run;
      await run;
      inflight.current = null;
      if (statusRef.current === 'pending' && !disposed.current) {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void persist(), SAVE_DELAY_MS);
      }
    },
    [queryClient, setStatus],
  );

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    return persist();
  }, [persist]);

  const change = useCallback(
    (patch: Partial<NoteInput>, immediate = false) => {
      valuesRef.current = { ...valuesRef.current, ...patch };
      setValues(valuesRef.current);
      if (statusRef.current === 'conflict') return;
      setStatus('pending');
      window.clearTimeout(timer.current);
      if (immediate) void persist();
      else timer.current = window.setTimeout(() => void persist(), SAVE_DELAY_MS);
    },
    [persist, setStatus],
  );

  const ensureCreated = useCallback(async (): Promise<string> => {
    if (idRef.current) return idRef.current;
    window.clearTimeout(timer.current);
    await persist(true);
    if (!idRef.current) throw new Error('Não foi possível criar a anotação');
    return idRef.current;
  }, [persist]);

  const resolveConflict = useCallback(
    (choice: 'reload' | 'keep') => {
      const current = conflict;
      if (!current) return;
      versionRef.current = current.version;
      setConflict(null);
      if (choice === 'reload') {
        valuesRef.current = toNoteInput(current);
        savedValuesRef.current = valuesRef.current;
        setValues(valuesRef.current);
        setSaved(current);
        queryClient.setQueryData(queryKeys.note(current.id), current);
        setRevision((value) => value + 1);
        setStatus('saved');
        return;
      }
      setStatus('pending');
      void persist();
    },
    [conflict, persist, queryClient, setStatus],
  );

  const discard = useCallback(() => {
    window.clearTimeout(timer.current);
    disposed.current = true;
  }, []);

  useEffect(() => {
    if (status === 'saved') return;
    const handleUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [status]);

  useEffect(() => {
    disposed.current = false;
    return () => {
      window.clearTimeout(timer.current);
      if (statusRef.current === 'pending' || statusRef.current === 'error') void persist();
      disposed.current = true;
    };
  }, [persist]);

  return {
    id: idRef.current,
    values,
    status,
    conflict,
    saved,
    revision,
    isDraft: !idRef.current,
    hasContent: hasContent(values),
    change,
    flush,
    ensureCreated,
    resolveConflict,
    discard,
  };
}
