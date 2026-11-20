import type { ChainedCommands, Editor } from '@tiptap/core';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  SquareCode,
  Table,
  TextQuote,
  type LucideIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { cx } from '../ui';
import { DEFAULT_CODE_LANGUAGE } from './markdown';

export interface SlashItem {
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords: string;
  run: (chain: ChainedCommands) => ChainedCommands;
}

export const SLASH_ITEMS: SlashItem[] = [
  { label: 'Título grande', hint: '#', icon: Heading1, keywords: 'titulo h1 cabecalho', run: (c) => c.setHeading({ level: 1 }) },
  { label: 'Título médio', hint: '##', icon: Heading2, keywords: 'titulo h2 subtitulo', run: (c) => c.setHeading({ level: 2 }) },
  { label: 'Título pequeno', hint: '###', icon: Heading3, keywords: 'titulo h3', run: (c) => c.setHeading({ level: 3 }) },
  { label: 'Lista', hint: '-', icon: List, keywords: 'lista marcadores bullet', run: (c) => c.toggleBulletList() },
  { label: 'Lista numerada', hint: '1.', icon: ListOrdered, keywords: 'lista numerada passos', run: (c) => c.toggleOrderedList() },
  { label: 'Lista de tarefas', hint: '[ ]', icon: ListChecks, keywords: 'tarefas checklist todo', run: (c) => c.toggleTaskList() },
  { label: 'Citação / destaque', hint: '>', icon: TextQuote, keywords: 'citacao destaque aviso quote', run: (c) => c.toggleBlockquote() },
  {
    label: 'Bloco de código',
    hint: '```',
    icon: SquareCode,
    keywords: 'codigo comando terminal bash sql script',
    run: (c) => c.setCodeBlock({ language: DEFAULT_CODE_LANGUAGE }),
  },
  { label: 'Tabela', icon: Table, keywords: 'tabela grade colunas', run: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { label: 'Linha divisória', hint: '---', icon: Minus, keywords: 'divisor linha separador', run: (c) => c.setHorizontalRule() },
];

export interface SlashState {
  from: number;
  to: number;
  query: string;
  items: SlashItem[];
  index: number;
  left: number;
  top: number;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function detectSlash(editor: Editor, previous: SlashState | null): SlashState | null {
  const { $from, empty } = editor.state.selection;
  if (!editor.isEditable || !empty || $from.parent.type.name !== 'paragraph') return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
  const match = /^\/([\p{L}\d ]{0,24})$/u.exec(before);
  if (!match) return null;

  const query = normalize(match[1]!.trim());
  const items = SLASH_ITEMS.filter((item) => !query || normalize(`${item.label} ${item.keywords}`).includes(query));
  if (items.length === 0) return null;

  const coords = editor.view.coordsAtPos($from.start());
  const height = Math.min(items.length * 40 + 30, 440);
  return {
    from: $from.start(),
    to: $from.pos,
    query,
    items,
    index: previous && previous.query === query ? Math.min(previous.index, items.length - 1) : 0,
    left: coords.left,
    top: Math.min(coords.bottom + 6, window.innerHeight - 16 - height),
  };
}

export function applySlash(editor: Editor, state: SlashState, index: number) {
  const item = state.items[index];
  if (!item) return;
  item.run(editor.chain().focus().deleteRange({ from: state.from, to: state.to })).run();
}

interface SlashMenuProps {
  state: SlashState;
  onChoose: (index: number) => void;
}

export function SlashMenu({ state, onChoose }: SlashMenuProps) {
  return createPortal(
    <div
      role="listbox"
      aria-label="Inserir bloco"
      style={{ left: state.left, top: state.top }}
      className="fixed z-50 w-72 rounded-xl border border-line-strong bg-raised p-1 shadow-2xl shadow-black/50"
      onMouseDown={(event) => event.preventDefault()}
    >
      <p className="px-2.5 pt-1.5 pb-1 text-2xs font-medium tracking-wider text-fg-subtle uppercase">Inserir</p>
      {state.items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          role="option"
          aria-selected={index === state.index}
          onClick={() => onChoose(index)}
          className={cx(
            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm',
            index === state.index ? 'bg-raised-hover text-fg' : 'text-fg-soft hover:bg-raised-hover',
          )}
        >
          <span className="grid size-7 place-items-center rounded-md bg-surface ring-1 ring-line ring-inset">
            <item.icon className="size-4 text-fg-muted" />
          </span>
          <span className="flex-1">{item.label}</span>
          {item.hint && <kbd className="font-mono text-2xs text-fg-faint">{item.hint}</kbd>}
        </button>
      ))}
    </div>,
    document.body,
  );
}
