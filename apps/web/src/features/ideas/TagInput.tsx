import { X } from 'lucide-react';
import { useId, useState } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

const MAX_TAGS = 20;

export function TagInput({ value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase().replace(/^#/, '').slice(0, 40);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg bg-surface p-2 ring-1 ring-inset ring-line transition focus-within:ring-accent">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded bg-raised py-0.5 pr-1 pl-1.5 text-xs text-fg-soft">
          #{tag}
          <button
            type="button"
            title={`Remover ${tag}`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className="text-fg-subtle hover:text-fg-soft"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list={listId}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          if (next.endsWith(',') || next.endsWith(' ')) add(next.slice(0, -1));
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add(draft);
          } else if (event.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={value.length ? '' : 'Adicionar tag'}
        className="min-w-20 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-fg-faint"
      />
      <datalist id={listId}>
        {suggestions
          .filter((suggestion) => !value.includes(suggestion))
          .map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
      </datalist>
    </div>
  );
}
