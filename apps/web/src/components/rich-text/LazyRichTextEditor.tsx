import { Suspense, lazy } from 'react';
import { Spinner, cx } from '../ui';
import type { RichTextEditorProps } from './types';

const RichTextEditor = lazy(() => import('./RichTextEditor'));

export function LazyRichTextEditor(props: RichTextEditorProps) {
  return (
    <Suspense
      fallback={
        <div
          className={cx(
            'grid place-items-center rounded-xl border border-line bg-surface text-fg-faint',
            props.fill ? 'min-h-0 flex-1' : 'min-h-72',
          )}
        >
          <Spinner className="size-5" />
        </div>
      }
    >
      <RichTextEditor {...props} />
    </Suspense>
  );
}
