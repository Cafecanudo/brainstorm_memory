import { ChevronDown, ChevronUp, Film, ImageIcon, Paperclip, Pilcrow, Play, TextCursorInput, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import type { AttachmentKind } from '../../api/types';
import { HoldButton } from '../../components/HoldButton';
import { Kbd, cx } from '../../components/ui';
import { ACCEPTED_MIME_TYPES } from '../../lib/constants';
import { partitionFiles, useObjectUrl, usePasteFiles } from '../../lib/files';
import { formatBytes } from '../../lib/format';
import { MediaViewer } from './MediaViewer';

export interface AttachmentItem {
  key: string;
  kind: AttachmentKind;
  name: string;
  sizeBytes: number;
  src?: string;
  file?: File;
  downloadUrl?: string;
  inText?: boolean;
}

interface AttachmentPanelProps {
  items: AttachmentItem[];
  onFiles?: (files: File[]) => void;
  onRemove?: (key: string) => void;
  onInsert?: (item: AttachmentItem) => void;
  progress?: number | null;
  error?: string | null;
  note?: string;
  variant?: 'panel' | 'strip';
}

export function AttachmentPanel({
  items,
  onFiles,
  onRemove,
  onInsert,
  progress,
  error,
  note,
  variant = 'panel',
}: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const readOnly = !onFiles;
  const uploading = progress !== null && progress !== undefined;

  const accept = (files: File[]) => {
    if (!onFiles) return;
    const result = partitionFiles(files);
    setRejected(result.rejected.map((file) => file.name || file.type));
    if (result.accepted.length) {
      setExpanded(true);
      onFiles(result.accepted);
    }
  };

  usePasteFiles(accept, !readOnly);

  const dropHandlers = readOnly
    ? {}
    : {
        onDragOver: (event: DragEvent) => {
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: (event: DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: DragEvent) => {
          event.preventDefault();
          setDragging(false);
          accept(Array.from(event.dataTransfer.files));
        },
      };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple
      hidden
      accept={ACCEPTED_MIME_TYPES.join(',')}
      onChange={(event) => {
        accept(Array.from(event.target.files ?? []));
        event.target.value = '';
      }}
    />
  );

  const feedback = (
    <>
      {uploading && <UploadProgress progress={progress} />}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {rejected.length > 0 && (
        <p className="mt-2 text-xs text-amber-400">Ignorado (tipo não suportado): {rejected.join(', ')}</p>
      )}
    </>
  );

  const viewer = viewerIndex !== null && (
    <MediaViewer items={items} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
  );

  const tileActions = (item: AttachmentItem, index: number) => ({
    onOpen: () => setViewerIndex(index),
    onRemove: onRemove ? () => onRemove(item.key) : undefined,
    onInsert: onInsert && item.kind === 'image' && item.src ? () => onInsert(item) : undefined,
  });

  if (variant === 'strip') {
    const open = expanded ?? items.length > 0;
    return (
      <section aria-label="Anexos" className={cx('shrink-0 border-t border-line', dragging && 'bg-accent/5')} {...dropHandlers}>
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setExpanded(!open)}
            className="flex items-center gap-2 text-xs font-medium text-fg-muted hover:text-fg"
          >
            <Paperclip className="size-3.5" />
            Anexos
            <span className="text-fg-subtle tabular-nums">{items.length}</span>
            {open ? <ChevronDown className="size-3.5 text-fg-faint" /> : <ChevronUp className="size-3.5 text-fg-faint" />}
          </button>
          {note && <span className="ml-auto text-2xs text-fg-faint">{note}</span>}
        </div>
        {open && (
          <div className="px-4 pb-3">
            <ul className="scrollbar-thin flex gap-3 overflow-x-auto">
              {items.map((item, index) => (
                <StripTile key={item.key} item={item} {...tileActions(item, index)} />
              ))}
              {!readOnly && (
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="grid h-24 w-40 place-items-center rounded-lg border border-dashed border-line-strong text-fg-subtle transition-colors hover:border-accent hover:text-accent-soft"
                  >
                    <span className="flex flex-col items-center gap-1 text-center text-2xs">
                      <Upload className="size-4" />
                      Arraste ou clique
                      <span className="text-fg-faint">PNG · JPG · GIF · WEBP · WEBM · MP4</span>
                    </span>
                  </button>
                </li>
              )}
            </ul>
            {feedback}
          </div>
        )}
        {fileInput}
        {viewer}
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-medium text-fg-soft">
        Anexos
        {items.length > 0 && <span className="text-xs font-normal text-fg-faint">{items.length}</span>}
        {note && <span className="ml-auto text-xs font-normal text-fg-subtle">{note}</span>}
      </h2>

      {!readOnly && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && inputRef.current?.click()}
          {...dropHandlers}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:border-accent',
            dragging ? 'border-accent bg-accent/5' : 'border-line hover:border-line-strong hover:bg-surface',
          )}
        >
          <Upload className="size-5 text-fg-subtle" />
          <p className="text-sm text-fg-soft">
            Cole um print com <Kbd>Ctrl V</Kbd>, arraste arquivos ou clique para escolher
          </p>
          <p className="text-xs text-fg-faint">PNG · JPG · GIF · WEBP · WEBM · MP4</p>
        </div>
      )}
      {fileInput}
      {feedback}

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <PanelTile key={item.key} item={item} {...tileActions(item, index)} />
          ))}
        </ul>
      )}
      {viewer}
    </section>
  );
}

interface TileProps {
  item: AttachmentItem;
  onOpen: () => void;
  onRemove?: () => void;
  onInsert?: () => void;
}

function Preview({ item, className }: { item: AttachmentItem; className: string }) {
  const objectUrl = useObjectUrl(item.file);
  const src = item.src ?? objectUrl;
  if (!src) return null;
  if (item.kind === 'image') return <img src={src} alt={item.name} loading="lazy" className={className} />;
  return (
    <span className="relative block size-full">
      <video src={`${src}#t=0.1`} preload="metadata" muted className={className} />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-9 place-items-center rounded-full bg-black/60 ring-1 ring-white/10 backdrop-blur">
          <Play className="size-4 translate-x-px fill-white text-white" />
        </span>
      </span>
    </span>
  );
}

function InTextBadge({ hideOnHover }: { hideOnHover: boolean }) {
  return (
    <span
      title="Esta imagem está no texto"
      className={cx(
        'absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 text-2xs font-medium text-accent-soft transition',
        hideOnHover && 'group-focus-within:opacity-0 group-hover:opacity-0',
      )}
    >
      <Pilcrow className="size-3" />
      No texto
    </span>
  );
}

function RemoveButton({ item, onRemove }: { item: AttachmentItem; onRemove: () => void }) {
  return (
    <HoldButton
      label={`Segure 3 s para remover ${item.name}${item.inText ? ' (sai do texto também)' : ''}`}
      onConfirm={onRemove}
      className="grid size-7 place-items-center rounded-md bg-black/60 text-fg-soft backdrop-blur hover:text-rose-400"
    >
      <Trash2 className="size-3.5" />
    </HoldButton>
  );
}

function InsertButton({ onInsert }: { onInsert: () => void }): ReactNode {
  return (
    <button
      type="button"
      title="Inserir no texto, onde está o cursor"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onInsert}
      className="inline-flex h-7 items-center gap-1 rounded-md bg-accent px-2 text-2xs font-semibold text-accent-fg hover:bg-accent-hover"
    >
      <TextCursorInput className="size-3.5" />
      No texto
    </button>
  );
}

function StripTile({ item, onOpen, onRemove, onInsert }: TileProps) {
  return (
    <li className="group relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-sunken" title={item.name}>
      <button type="button" onClick={onOpen} aria-label={`Ver ${item.name}`} className="block size-full">
        <Preview item={item} className="size-full object-cover object-left-top" />
      </button>
      {item.inText && <InTextBadge hideOnHover={Boolean(onInsert || onRemove)} />}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pt-5 pb-1 text-2xs text-fg-soft">
        {item.name}
      </span>
      {(onInsert || onRemove) && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          {onInsert && <InsertButton onInsert={onInsert} />}
          {onRemove && <RemoveButton item={item} onRemove={onRemove} />}
        </div>
      )}
    </li>
  );
}

function PanelTile({ item, onOpen, onRemove, onInsert }: TileProps) {
  const KindIcon = item.kind === 'image' ? ImageIcon : Film;
  return (
    <li className="group relative overflow-hidden rounded-lg border border-line bg-sunken">
      <button type="button" onClick={onOpen} className="block aspect-video w-full bg-surface">
        <Preview item={item} className="size-full object-cover" />
      </button>
      {item.inText && <InTextBadge hideOnHover={Boolean(onInsert || onRemove)} />}
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
        <KindIcon className="size-3.5 shrink-0 text-fg-subtle" />
        <span className="truncate text-fg-muted" title={item.name}>
          {item.name}
        </span>
        <span className="ml-auto shrink-0 text-fg-faint">{formatBytes(item.sizeBytes)}</span>
      </div>
      {(onInsert || onRemove) && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          {onInsert && <InsertButton onInsert={onInsert} />}
          {onRemove && <RemoveButton item={item} onRemove={onRemove} />}
        </div>
      )}
    </li>
  );
}

function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="mt-3 flex items-center gap-3 text-xs text-fg-muted">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <span className="w-24 text-right tabular-nums">
        {progress < 1 ? `Enviando ${Math.round(progress * 100)}%` : 'Processando...'}
      </span>
    </div>
  );
}
