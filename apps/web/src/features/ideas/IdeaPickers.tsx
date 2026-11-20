import { Flag } from 'lucide-react';
import type { IdeaPriority, IdeaStatus } from '../../api/types';
import { cx } from '../../components/ui';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../lib/constants';
import { formatDateTime } from '../../lib/format';

const idleClass = 'text-fg-subtle ring-line hover:text-fg-soft hover:ring-line-strong';

export function StatusPicker({ value, onChange }: { value: IdeaStatus; onChange: (status: IdeaStatus) => void }) {
  return (
    <div role="group" aria-label="Status" className="grid grid-cols-2 gap-1.5">
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'rounded-lg px-2 py-1.5 text-xs font-medium ring-1 ring-inset transition',
            value === option.value ? option.className : idleClass,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function PriorityPicker({ value, onChange }: { value: IdeaPriority; onChange: (priority: IdeaPriority) => void }) {
  return (
    <div role="group" aria-label="Prioridade" className="grid grid-cols-3 gap-1.5">
      {PRIORITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium ring-1 ring-inset transition',
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
