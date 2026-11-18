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
    <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/40 transition-colors focus-within:border-zinc-700">
      <div className="flex items-center gap-1 border-b border-zinc-800/80 px-2 py-1.5">
        <TabButton active={mode === 'write'} onClick={() => setMode('write')}>
          Escrever
        </TabButton>
        <TabButton active={mode === 'preview'} onClick={() => setMode('preview')}>
          Visualizar
        </TabButton>
        <span className="ml-auto pr-2 text-[11px] text-zinc-600">Markdown</span>
      </div>
      {mode === 'write' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={'Contexto, problema, abordagem, links...\n\nCole prints aqui com Ctrl+V: eles viram anexos.'}
          className="field-sizing-content block min-h-72 w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
        />
      ) : (
        <div
          onDoubleClick={() => setMode('write')}
          className="prose prose-sm prose-invert min-h-72 max-w-none p-4 prose-headings:tracking-tight prose-a:text-indigo-300 prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-950"
        >
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-zinc-600">Sem descrição. Clique duas vezes para editar.</p>
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
        active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
      )}
    >
      {children}
    </button>
  );
}
