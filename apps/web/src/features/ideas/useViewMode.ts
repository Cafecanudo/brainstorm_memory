import { useState } from 'react';

export type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'brainstorm.viewMode';

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
}

export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(readViewMode);

  const change = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      return;
    }
  };

  return [mode, change] as const;
}
