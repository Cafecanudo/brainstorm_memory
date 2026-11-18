import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cx } from '../../components/ui';

type Mode = 'write' | 'preview';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  defaultMode?: Mode;
}

export function MarkdownEditor({ value, onChange, defaultMode = 'write' }: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface transition-colors focus-within:border-line-strong">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <TabButton active={mode === 'write'} onClick={() => setMode('write')}>
          Escrever
        </TabButton>
        <TabButton active={mode === 'preview'} onClick={() => setMode('preview')}>
          Visualizar
        </TabButton>
        <span className="ml-auto pr-2 text-2xs text-fg-faint">Markdown</span>
      </div>
      {mode === 'write' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={'Contexto, problema, abordagem, links...\n\nCole prints aqui com Ctrl+V: eles viram anexos.'}
          className="field-sizing-content block min-h-72 w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-fg-soft outline-none placeholder:text-fg-faint"
        />
      ) : (
        <div
          onDoubleClick={() => setMode('write')}
          className="prose prose-sm text-sm prose-invert prose-warm min-h-72 max-w-none p-4 prose-headings:tracking-tight prose-a:text-accent-soft prose-code:before:content-none prose-code:after:content-none prose-pre:bg-sunken"
        >
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-fg-faint">Sem descrição. Clique duas vezes para editar.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-soft',
      )}
    >
      {children}
    </button>
  );
}
