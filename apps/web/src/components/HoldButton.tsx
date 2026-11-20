import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { cx } from './ui';

interface HoldButtonProps {
  onConfirm: () => void;
  label: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  duration?: number;
}

export function HoldButton({ onConfirm, label, children, className, disabled, duration = 3000 }: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const confirmRef = useRef(onConfirm);

  useEffect(() => {
    confirmRef.current = onConfirm;
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = () => {
    if (disabled || timer.current !== undefined) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      confirmRef.current();
    }, duration);
  };

  const cancel = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };

  const holdKey = (event: KeyboardEvent) => event.key === 'Enter' || event.key === ' ';

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event: PointerEvent) => event.button === 0 && start()}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if (!holdKey(event)) return;
        event.preventDefault();
        if (!event.repeat) start();
      }}
      onKeyUp={(event) => holdKey(event) && cancel()}
      onClick={(event) => event.preventDefault()}
      data-holding={holding || undefined}
      className={cx('relative overflow-hidden select-none disabled:cursor-not-allowed disabled:opacity-40', className)}
    >
      <span
        aria-hidden
        className="absolute inset-0 origin-left bg-rose-500/30"
        style={{
          transform: holding ? 'scaleX(1)' : 'scaleX(0)',
          transition: holding ? `transform ${duration}ms linear` : 'transform 150ms ease-out',
        }}
      />
      <span className="relative inline-flex items-center justify-center gap-1.5">{children}</span>
    </button>
  );
}
