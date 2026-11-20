import { Flag } from 'lucide-react';
import type { IdeaPriority, IdeaStatus } from '../../api/types';
import { cx } from '../../components/ui';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/constants';
import { formatDateTime } from '../../lib/format';

type Layout = 'grid' | 'inline';

const idleClass = 'text-fg-subtle ring-line hover:text-fg-soft hover:ring-line-strong';

const containerClass = (layout: Layout, columns: string) =>
  layout === 'grid' ? cx('grid gap-1.5', columns) : 'flex flex-wrap items-center gap-1';

const buttonClass = (layout: Layout) =>
  cx(
    'flex items-center justify-center gap-1 rounded-lg font-medium ring-1 ring-inset transition',
    layout === 'grid' ? 'px-2 py-1.5 text-xs' : 'h-7 px-2.5 text-2xs',
  );

interface PickerProps<T> {
  value: T;
  onChange: (value: T) => void;
  layout?: Layout;
}

export function StatusPicker({ value, onChange, layout = 'grid' }: PickerProps<IdeaStatus>) {
  return (
    <div role="group" aria-label="Status" className={containerClass(layout, 'grid-cols-2')}>
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(buttonClass(layout), value === option.value ? option.className : idleClass)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PriorityPicker({ value, onChange, layout = 'grid' }: PickerProps<IdeaPriority>) {
  return (
    <div role="group" aria-label="Prioridade" className={containerClass(layout, 'grid-cols-3')}>
      {PRIORITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            buttonClass(layout),
            value === option.value ? cx('bg-raised ring-fg-faint', option.className) : idleClass,
          )}
        >
          <Flag className="size-3" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function IdeaDates({ createdAt, updatedAt }: { createdAt: string; updatedAt: string }) {
  return (
    <dl className="space-y-1 border-t border-line pt-4 text-xs text-fg-subtle">
      <div className="flex justify-between gap-2">
        <dt>Criada</dt>
        <dd className="text-fg-muted">{formatDateTime(createdAt)}</dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt>Atualizada</dt>
        <dd className="text-fg-muted">{formatDateTime(updatedAt)}</dd>
      </div>
    </dl>
  );
}
