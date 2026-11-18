import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import type { IdeaStatus } from '../api/types';
import { STATUS_META } from '../lib/constants';

export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-500 text-white shadow-sm shadow-indigo-950 hover:bg-indigo-400 disabled:bg-indigo-500/40 disabled:text-white/60',
  secondary: 'bg-zinc-800/80 text-zinc-100 ring-1 ring-inset ring-zinc-700/80 hover:bg-zinc-700/80 disabled:opacity-50',
  ghost: 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 disabled:opacity-40',
  danger: 'text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'size-9 justify-center',
};

const buttonClass = (variant: Variant, size: Size, className?: string) =>
  cx(
    'inline-flex shrink-0 items-center rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed [&_svg]:size-4',
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
    <div className="grid h-full place-items-center text-zinc-500">
      <Spinner className="size-6" />
    </div>
  );
}

export function StatusBadge({ status }: { status: IdeaStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', meta.className)}>
      {meta.label}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-px font-sans text-[10px] font-medium text-zinc-400">
      {children}
    </kbd>
  );
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-zinc-900 text-zinc-500 [&_svg]:size-5">{icon}</div>
      <h3 className="font-medium text-zinc-200">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-inset ring-zinc-800 outline-none transition placeholder:text-zinc-600 focus:ring-indigo-500';
