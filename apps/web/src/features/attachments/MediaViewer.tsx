import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useObjectUrl } from '../../lib/files';
import type { AttachmentItem } from './AttachmentPanel';

interface MediaViewerProps {
  items: AttachmentItem[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function MediaViewer({ items, index, onIndexChange, onClose }: MediaViewerProps) {
  const item = items[index];
  const objectUrl = useObjectUrl(item?.file);
  const src = item?.src ?? objectUrl;
  const count = items.length;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
      else if (event.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [index, count, onClose, onIndexChange]);

  if (!item) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm" onClick={onClose}>
      <header className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-300" onClick={(event) => event.stopPropagation()}>
        <span className="truncate">{item.name}</span>
        {count > 1 && (
          <span className="shrink-0 text-zinc-500 tabular-nums">
            {index + 1} / {count}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {item.downloadUrl && (
            <a href={item.downloadUrl} title="Baixar" className="rounded-md p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
              <Download className="size-4" />
            </a>
          )}
          <button type="button" title="Fechar (Esc)" onClick={onClose} className="rounded-md p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-8">
        {count > 1 && (
          <NavButton side="left" onClick={() => onIndexChange((index - 1 + count) % count)} />
        )}
        {src &&
          (item.kind === 'image' ? (
            <img
              src={src}
              alt={item.name}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
          ) : (
            <video
              key={item.key}
              src={src}
              controls
              autoPlay
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-lg bg-black shadow-2xl"
            />
          ))}
        {count > 1 && <NavButton side="right" onClick={() => onIndexChange((index + 1) % count)} />}
      </div>
    </div>,
    document.body,
  );
}

function NavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 ${side === 'left' ? 'left-4' : 'right-4'} -translate-y-1/2 rounded-full bg-white/5 p-2.5 text-zinc-300 hover:bg-white/15 hover:text-white`}
    >
      <Icon className="size-5" />
    </button>
  );
}
