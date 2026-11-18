import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import type { IdeaStatus } from '../api/types';
import { STATUS_META } from '../lib/constants';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg shadow-sm shadow-black/20 hover:bg-accent-hover disabled:bg-accent/40 disabled:text-accent-fg/60',
  secondary: 'bg-raised text-fg ring-1 ring-inset ring-line-strong hover:bg-raised-hover disabled:opacity-50',
  ghost: 'text-fg-muted hover:bg-raised hover:text-fg disabled:opacity-40',
  danger: 'text-fg-muted hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'size-9 justify-center',
};

const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(
    'inline-flex shrink-0 items-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed [&_svg]:size-4',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'secondary', size = 'md', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
}

export function ButtonLink({ variant = 'secondary', size = 'md', disabled, className, children, ...props }: ButtonLinkProps) {
  if (disabled) {
    return (
      <span aria-disabled className={buttonClass(variant, size, cx('cursor-not-allowed opacity-50', className))}>
        {children as ReactNode}
      </span>
    );
  }
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cx('animate-spin', className ?? 'size-4')} />;
}

export function PageSpinner() {
  return (
    <div className="grid h-full place-items-center text-fg-subtle">
      <Spinner className="size-6" />
    </div>
  );
}

export function StatusBadge({ status }: { status: IdeaStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ring-1 ring-inset', meta.className)}>
      {meta.label}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-2xs font-medium uppercase tracking-wider text-fg-subtle">{label}</span>
      {children}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-raised px-1.5 py-px font-sans text-2xs font-medium text-fg-muted">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-20 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-surface text-fg-subtle [&_svg]:size-5">{icon}</div>
      <h3 className="font-medium text-fg-soft">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-subtle">{description}</p>
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg bg-surface px-3 py-2 text-sm text-fg ring-1 ring-inset ring-line outline-none transition placeholder:text-fg-faint focus:ring-accent';

export interface SegmentOption<T extends string> {
  value: T | undefined;
  label: ReactNode;
  title?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-lg bg-surface p-1 ring-1 ring-inset ring-line">
      {options.map((option) => (
        <button
          key={option.value ?? 'all'}
          type="button"
          title={option.title}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors [&_svg]:size-3.5',
            value === option.value ? 'bg-raised-hover text-fg' : 'text-fg-muted hover:text-fg-soft',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
