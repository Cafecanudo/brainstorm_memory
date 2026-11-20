import { cx } from './ui';

export function ProjectDot({ color, size = 'md' }: { color: string | null | undefined; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'size-2' : 'size-2.5';
  return color ? (
    <span className={cx(sizeClass, 'shrink-0 rounded-full')} style={{ backgroundColor: color }} />
  ) : (
    <span className={cx(sizeClass, 'shrink-0 rounded-full border border-dashed border-fg-faint')} />
  );
}
