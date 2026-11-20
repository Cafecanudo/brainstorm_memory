import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor, type UseEditorOptions } from '@tiptap/react';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ACCEPTED_IMAGE_TYPES } from '../../lib/constants';
import { normalizePastedFile } from '../../lib/files';
import { cx } from '../ui';
import { buildExtensions } from './extensions';
import { normalizeMarkdown } from './markdown';
import { SlashMenu, applySlash, detectSlash, type SlashState } from './SlashMenu';
import { Toolbar } from './Toolbar';
import type { RichTextEditorProps } from './types';

const CONTENT_CLASS =
  'rich-text prose prose-sm prose-invert prose-warm max-w-none px-5 pt-4 pb-10 text-sm outline-none prose-headings:tracking-tight prose-a:text-accent-soft prose-code:before:content-none prose-code:after:content-none prose-pre:bg-sunken';

function imageFiles(transfer: DataTransfer | null): File[] {
  return Array.from(transfer?.files ?? [])
    .filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type))
    .map(normalizePastedFile);
}

export default function RichTextEditor({
  ref,
  value,
  onChange,
  editable,
  placeholder,
  readOnlyPlaceholder = '',
  ariaLabel,
  fill = false,
  footer,
  uploadImages,
  onRequestEdit,
  onEscape,
}: RichTextEditorProps) {
  const callbacks = useRef({ onChange, uploadImages, onEscape, onRequestEdit });
  const editorRef = useRef<Editor | null>(null);
  const lastMarkdown = useRef(normalizeMarkdown(value));
  const pendingFocus = useRef<number | null>(null);
  const slashRef = useRef<SlashState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [slash, setSlashState] = useState<SlashState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [raw, setRaw] = useState(false);
  const [rawValue, setRawValue] = useState('');

  useEffect(() => {
    callbacks.current = { onChange, uploadImages, onEscape, onRequestEdit };
  });

  const setSlash = (next: SlashState | null) => {
    slashRef.current = next;
    setSlashState(next);
  };

  const emit = (markdown: string) => {
    const normalized = normalizeMarkdown(markdown);
    if (normalized === lastMarkdown.current) return;
    lastMarkdown.current = normalized;
    callbacks.current.onChange?.(normalized);
  };

  const insertUploaded = async (files: File[], position?: number) => {
    const upload = callbacks.current.uploadImages;
    const instance = editorRef.current;
    if (!upload || !instance || files.length === 0) return;
    const images = await upload(files).catch(() => []);
    if (images.length === 0 || instance.isDestroyed) return;
    const content = images.map((image) => ({ type: 'image', attrs: { src: image.src, alt: image.alt } }));
    const at = Math.min(position ?? instance.state.selection.from, instance.state.doc.content.size);
    instance.chain().focus().insertContentAt(at, content).run();
  };

  const handleKey = (event: KeyboardEvent): boolean => {
    const instance = editorRef.current;
    const current = slashRef.current;
    if (!instance) return false;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      setLinkOpen(true);
      return true;
    }
    if (current) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setSlash({ ...current, index: (current.index + step + current.items.length) % current.items.length });
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        setSlash(null);
        applySlash(instance, current, current.index);
        return true;
      }
      if (event.key === 'Escape') {
        setSlash(null);
        return true;
      }
      return false;
    }
    if (event.key === 'Escape' && callbacks.current.onEscape) {
      callbacks.current.onEscape();
      return true;
    }
    return false;
  };

  const toggleChecklistReadOnly = (checkbox: HTMLInputElement) => {
    const instance = editorRef.current;
    const item = checkbox.closest('li[data-checked]');
    if (!instance || instance.isEditable || !item) return;
    const $pos = instance.state.doc.resolve(instance.view.posAtDOM(item, 0));
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.name !== 'taskItem') continue;
      instance.view.dispatch(instance.state.tr.setNodeMarkup($pos.before(depth), undefined, { ...node.attrs, checked: checkbox.checked }));
      return;
    }
  };

  const [options] = useState<UseEditorOptions>(() => ({
    editable,
    extensions: buildExtensions({ placeholder, readOnlyPlaceholder }),
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: { class: CONTENT_CLASS, 'aria-label': ariaLabel, role: 'textbox', 'aria-multiline': 'true' },
      handleKeyDown: (_view, event) => handleKey(event),
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData);
        if (files.length === 0 || !callbacks.current.uploadImages) return false;
        event.preventDefault();
        void insertUploaded(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFiles(event.dataTransfer);
        if (files.length === 0 || !callbacks.current.uploadImages) return false;
        event.preventDefault();
        void insertUploaded(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
    },
    onCreate: ({ editor: instance }) => {
      editorRef.current = instance;
      lastMarkdown.current = normalizeMarkdown(instance.getMarkdown());
    },
    onUpdate: ({ editor: instance }) => {
      emit(instance.getMarkdown());
      setSlash(detectSlash(instance, slashRef.current));
    },
    onSelectionUpdate: ({ editor: instance }) => setSlash(detectSlash(instance, slashRef.current)),
    onBlur: () => window.setTimeout(() => setSlash(null), 150),
    onDestroy: () => {
      editorRef.current = null;
    },
  }));

  const editor = useEditor(options);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const handleChange = (event: Event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') toggleChecklistReadOnly(event.target);
    };
    element.addEventListener('change', handleChange);
    return () => element.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!editor || editor.isEditable === editable) return;
    options.editable = editable;
    editor.setEditable(editable, false);
    setLinkOpen(false);
    setSlash(null);
    if (!editable) {
      setRaw(false);
      return;
    }
    const position = pendingFocus.current;
    pendingFocus.current = null;
    editor.chain().focus(position ?? 'end').run();
  }, [editor, editable]);

  useImperativeHandle(
    ref,
    () => ({
      insertImage: (image) => {
        editor?.chain().focus().setImage({ src: image.src, alt: image.alt }).run();
      },
      removeImages: (src) => {
        if (!editor) return;
        const positions: number[] = [];
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === src) positions.push(pos);
        });
        if (positions.length === 0) return;
        const transaction = editor.state.tr;
        positions.reverse().forEach((pos) => transaction.delete(pos, pos + 1));
        editor.view.dispatch(transaction);
      },
      focus: () => {
        if (!editor) return;
        editor.view.focus();
        editor.commands.focus('end');
      },
    }),
    [editor],
  );

  const toggleRaw = () => {
    if (!editor) return;
    if (raw) {
      editor.commands.setContent(rawValue, { contentType: 'markdown', emitUpdate: false });
      lastMarkdown.current = normalizeMarkdown(rawValue);
      setRaw(false);
      editor.commands.focus();
    } else {
      setRawValue(normalizeMarkdown(editor.getMarkdown()));
      setLinkOpen(false);
      setRaw(true);
    }
  };

  return (
    <div
      className={cx(
        'flex flex-col overflow-hidden rounded-xl border bg-surface transition-colors',
        fill && 'min-h-0 flex-1',
        editable ? 'border-line-strong' : 'border-line',
      )}
    >
      {editable && editor && (
        <Toolbar
          editor={editor}
          raw={raw}
          linkOpen={linkOpen}
          canInsertImage={Boolean(uploadImages)}
          onToggleRaw={toggleRaw}
          onLinkOpenChange={setLinkOpen}
          onPickImage={() => fileInputRef.current?.click()}
        />
      )}

      {raw && (
        <textarea
          aria-label={`${ariaLabel} em Markdown`}
          spellCheck={false}
          value={rawValue}
          autoFocus
          onChange={(event) => {
            setRawValue(event.target.value);
            emit(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && onEscape) {
              event.preventDefault();
              onEscape();
            }
          }}
          className={cx(
            'scrollbar-thin block w-full resize-none bg-transparent px-5 py-4 font-mono text-sm leading-relaxed text-fg outline-none',
            fill ? 'min-h-0 flex-1 overflow-y-auto' : 'field-sizing-content min-h-72',
          )}
        />
      )}

      <div
        ref={contentRef}
        hidden={raw}
        title={editable ? undefined : 'Dois cliques para editar'}
        onDoubleClick={(event) => {
          if (editable || !editor || !onRequestEdit) return;
          if ((event.target as HTMLElement).closest('.copy-code, input, a')) return;
          pendingFocus.current = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null;
          onRequestEdit();
        }}
        onClick={(event) => {
          if (editable) return;
          const anchor = (event.target as HTMLElement).closest('a');
          if (!anchor) return;
          event.preventDefault();
          window.open(anchor.href, '_blank', 'noopener,noreferrer');
        }}
        className={cx('scrollbar-thin', fill ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-72')}
      >
        <EditorContent editor={editor} />
      </div>

      {footer}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        onChange={(event) => {
          void insertUploaded(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />

      {slash && editor && (
        <SlashMenu
          state={slash}
          onChoose={(index) => {
            setSlash(null);
            applySlash(editor, slash, index);
          }}
        />
      )}
    </div>
  );
}
