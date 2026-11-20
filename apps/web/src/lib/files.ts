import { useEffect, useRef, useState } from 'react';
import { ACCEPTED_MIME_TYPES } from './constants';
import { timestampedName } from './format';

export function partitionFiles(files: File[]) {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    (ACCEPTED_MIME_TYPES.includes(file.type) ? accepted : rejected).push(file);
  }
  return { accepted, rejected };
}

export function normalizePastedFile(file: File): File {
  if (file.name && !/^image\.\w+$/i.test(file.name)) return file;
  return new File([file], timestampedName(file), { type: file.type, lastModified: Date.now() });
}

export function usePasteFiles(onFiles: (files: File[]) => void, enabled = true) {
  const handlerRef = useRef(onFiles);

  useEffect(() => {
    handlerRef.current = onFiles;
  });

  useEffect(() => {
    if (!enabled) return;
    const handlePaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      event.preventDefault();
      handlerRef.current(files.map(normalizePastedFile));
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [enabled]);
}

export function useObjectUrl(file: File | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
      setUrl(undefined);
    };
  }, [file]);

  return url;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
