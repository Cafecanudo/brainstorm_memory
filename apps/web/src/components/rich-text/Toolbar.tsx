import type { ChainedCommands, Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  Bold,
  ChevronDown,
  Code,
  FileCode2,
  ImagePlus,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Redo2,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '../ui';
import { CODE_LANGUAGES, DEFAULT_CODE_LANGUAGE } from './markdown';

interface ToolbarProps {
  editor: Editor;
  raw: boolean;
  linkOpen: boolean;
  canInsertImage: boolean;
  onToggleRaw: () => void;
  onLinkOpenChange: (open: boolean) => void;
  onPickImage: () => void;
}

const BLOCK_TYPES = [
  { value: '0', label: 'Texto' },
  { value: '1', label: 'Título grande' },
  { value: '2', label: 'Título médio' },
  { value: '3', label: 'Título pequeno' },
];

export function Toolbar({ editor, raw, linkOpen, canInsertImage, onToggleRaw, onLinkOpenChange, onPickImage }: ToolbarProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      heading: [1, 2, 3].find((level) => instance.isActive('heading', { level })) ?? 0,
      bold: instance.isActive('bold'),
      italic: instance.isActive('italic'),
      strike: instance.isActive('strike'),
      code: instance.isActive('code'),
      link: instance.isActive('link'),
      href: (instance.getAttributes('link').href as string | undefined) ?? '',
      bulletList: instance.isActive('bulletList'),
      orderedList: instance.isActive('orderedList'),
      taskList: instance.isActive('taskList'),
      blockquote: instance.isActive('blockquote'),
      codeBlock: instance.isActive('codeBlock'),
      language: (instance.getAttributes('codeBlock').language as string | undefined) ?? 'plaintext',
      table: instance.isActive('table'),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  const run = (command: (chain: ChainedCommands) => ChainedCommands) => command(editor.chain().focus()).run();

  const button = (label: string, Icon: LucideIcon, active: boolean, command: () => void, disabled = false) => (
    <ToolButton key={label} label={label} active={active} disabled={raw || disabled} onClick={command}>
      <Icon />
    </ToolButton>
  );

  return (
    <div role="toolbar" aria-label="Formatação" className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
      <label className="relative mr-1 flex h-8 items-center rounded-md hover:bg-raised">
        <select
          aria-label="Tipo de parágrafo"
          disabled={raw}
          value={String(state.heading)}
          onChange={(event) => {
            const level = Number(event.target.value) as 0 | 1 | 2 | 3;
            run((chain) => (level === 0 ? chain.setParagraph() : chain.setHeading({ level })));
          }}
          className="h-8 appearance-none bg-transparent pr-6 pl-2.5 text-xs font-medium text-fg-soft outline-none disabled:opacity-30"
        >
          {BLOCK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-fg-faint" />
      </label>
      <Separator />
      {button('Negrito (Ctrl+B)', Bold, state.bold, () => run((c) => c.toggleBold()))}
      {button('Itálico (Ctrl+I)', Italic, state.italic, () => run((c) => c.toggleItalic()))}
      {button('Riscado', Strikethrough, state.strike, () => run((c) => c.toggleStrike()))}
      {button('Código na linha', Code, state.code, () => run((c) => c.toggleCode()))}
      {button('Link (Ctrl+K)', Link, state.link, () => onLinkOpenChange(!linkOpen))}
      <Separator />
      {button('Lista', List, state.bulletList, () => run((c) => c.toggleBulletList()))}
      {button('Lista numerada', ListOrdered, state.orderedList, () => run((c) => c.toggleOrderedList()))}
      {button('Lista de tarefas', ListChecks, state.taskList, () => run((c) => c.toggleTaskList()))}
      <Separator />
      {button('Citação', TextQuote, state.blockquote, () => run((c) => c.toggleBlockquote()))}
      {button('Bloco de código', SquareCode, state.codeBlock, () =>
        run((c) => c.toggleCodeBlock({ language: DEFAULT_CODE_LANGUAGE })),
      )}
      {button('Tabela', Table, state.table, () => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })))}
      {button('Linha divisória', Minus, false, () => run((c) => c.setHorizontalRule()))}
      {canInsertImage && button('Imagem no texto', ImagePlus, false, onPickImage)}

      <div className="ml-1 flex items-center gap-1">
        {linkOpen ? (
          <LinkInput
            initial={state.href}
            onSubmit={(href) => {
              const chain = editor.chain().focus().extendMarkRange('link');
              (href ? chain.setLink({ href }) : chain.unsetLink()).run();
              onLinkOpenChange(false);
            }}
            onCancel={() => {
              onLinkOpenChange(false);
              editor.commands.focus();
            }}
          />
        ) : state.codeBlock ? (
          <>
            <span className="text-2xs text-fg-subtle">Linguagem</span>
            <label className="relative flex h-8 items-center rounded-md bg-sunken ring-1 ring-line ring-inset">
              <select
                aria-label="Linguagem do bloco de código"
                value={state.language}
                onChange={(event) => run((c) => c.updateAttributes('codeBlock', { language: event.target.value }))}
                className="h-8 appearance-none bg-transparent pr-6 pl-2.5 text-xs font-medium text-fg-soft outline-none"
              >
                {CODE_LANGUAGES.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-fg-faint" />
            </label>
          </>
        ) : state.table ? (
          <>
            <TextButton onClick={() => run((c) => c.addRowAfter())}>+ Linha</TextButton>
            <TextButton onClick={() => run((c) => c.addColumnAfter())}>+ Coluna</TextButton>
            <TextButton onClick={() => run((c) => c.deleteRow())}>− Linha</TextButton>
            <TextButton onClick={() => run((c) => c.deleteColumn())}>− Coluna</TextButton>
            <TextButton danger onClick={() => run((c) => c.deleteTable())}>
              Excluir tabela
            </TextButton>
          </>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        {button('Desfazer (Ctrl+Z)', Undo2, false, () => run((c) => c.undo()), !state.canUndo)}
        {button('Refazer (Ctrl+Shift+Z)', Redo2, false, () => run((c) => c.redo()), !state.canRedo)}
        <Separator />
        <button
          type="button"
          title={raw ? 'Voltar ao editor visual' : 'Ver e editar o Markdown'}
          aria-pressed={raw}
          onClick={onToggleRaw}
          className={cx(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            raw ? 'bg-accent/15 text-accent-soft ring-1 ring-accent/25 ring-inset' : 'text-fg-muted hover:bg-raised hover:text-fg',
          )}
        >
          <FileCode2 className="size-4" />
          Markdown
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cx(
        'inline-flex size-8 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4',
        active ? 'bg-raised-hover text-accent-soft' : 'text-fg-muted hover:bg-raised hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function TextButton({ danger, onClick, children }: { danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cx(
        'h-7 rounded-md px-2 text-2xs font-medium ring-1 ring-line transition-colors ring-inset',
        danger ? 'text-fg-muted hover:bg-rose-500/10 hover:text-rose-400' : 'text-fg-soft hover:bg-raised',
      )}
    >
      {children}
    </button>
  );
}

function LinkInput({ initial, onSubmit, onCancel }: { initial: string; onSubmit: (href: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <input
      ref={inputRef}
      aria-label="Endereço do link"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSubmit(value.trim());
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
      placeholder="Cole o endereço e Enter (vazio remove)"
      className="h-8 w-72 rounded-md bg-sunken px-2.5 text-xs text-fg ring-1 ring-accent outline-none ring-inset placeholder:text-fg-faint"
    />
  );
}

function Separator() {
  return <span className="mx-1 h-5 w-px bg-line" />;
}
