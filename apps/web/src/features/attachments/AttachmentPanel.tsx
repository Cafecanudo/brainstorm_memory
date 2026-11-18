import { Film, ImageIcon, Play, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AttachmentKind } from '../../api/types';
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
}

interface AttachmentPanelProps {
  items: AttachmentItem[];
  onFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
  progress?: number | null;
  error?: string | null;
  note?: string;
}

export function AttachmentPanel({ items, onFiles, onRemove, progress, error, note }: AttachmentPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const uploading = progress !== null && progress !== undefined;

  const accept = (files: File[]) => {
    const result = partitionFiles(files);
    setRejected(result.rejected.map((file) => file.name || file.type));
    if (result.accepted.length) onFiles(result.accepted);
  };

  usePasteFiles(accept);

  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-medium text-fg-soft">
        Anexos
        {items.length > 0 && <span className="text-xs font-normal text-fg-faint">{items.length}</span>}
        {note && <span className="ml-auto text-xs font-normal text-fg-subtle">{note}</span>}
      </h2>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(Array.from(event.dataTransfer.files));
        }}
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

      {uploading && (
        <div className="mt-3 flex items-center gap-3 text-xs text-fg-muted">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="w-24 text-right tabular-nums">
            {progress < 1 ? `Enviando ${Math.round(progress * 100)}%` : 'Processando...'}
          </span>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      {rejected.length > 0 && (
        <p className="mt-2 text-xs text-amber-400">Ignorado (tipo não suportado): {rejected.join(', ')}</p>
      )}

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <AttachmentTile key={item.key} item={item} onOpen={() => setViewerIndex(index)} onRemove={() => onRemove(item.key)} />
          ))}
        </ul>
      )}

      {viewerIndex !== null && (
        <MediaViewer items={items} index={viewerIndex} onIndexChange={setViewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </section>
  );
}

function AttachmentTile({ item, onOpen, onRemove }: { item: AttachmentItem; onOpen: () => void; onRemove: () => void }) {
  const objectUrl = useObjectUrl(item.file);
  const src = item.src ?? objectUrl;
  const KindIcon = item.kind === 'image' ? ImageIcon : Film;

  return (
    <li className="group relative overflow-hidden rounded-lg border border-line bg-sunken">
      <button type="button" onClick={onOpen} className="block aspect-video w-full bg-surface">
        {src &&
          (item.kind === 'image' ? (
            <img src={src} alt={item.name} loading="lazy" className="size-full object-cover" />
          ) : (
            <span className="relative block size-full">
              <video src={`${src}#t=0.1`} preload="metadata" muted className="size-full object-cover" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-10 place-items-center rounded-full bg-black/60 ring-1 ring-white/10 backdrop-blur transition group-hover:scale-110">
                  <Play className="size-4 translate-x-px fill-white text-white" />
                </span>
              </span>
            </span>
          ))}
      </button>
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs">
        <KindIcon className="size-3.5 shrink-0 text-fg-subtle" />
        <span className="truncate text-fg-muted" title={item.name}>
          {item.name}
        </span>
        <span className="ml-auto shrink-0 text-fg-faint">{formatBytes(item.sizeBytes)}</span>
      </div>
      <button
        type="button"
        title="Remover"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 rounded-md bg-black/60 p-1.5 text-fg-soft opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-rose-400"
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
