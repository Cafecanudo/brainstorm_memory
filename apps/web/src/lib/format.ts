const relativeFormatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatRelative(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
  }
  return 'agora';
}

export function formatDateTime(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?(?:```|$)/g, ' ')
    .replace(/!\[[^\]]*(?:](?:\([^)]*\)?)?)?/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*$/gm, ' ')
    .replace(/^\s*(?:[-+*]|\d+\.)\s+(?:\[[ xX]]\s+)?/gm, ' ')
    .replace(/\s*\|\s*/g, ' · ')
    .replace(/&nbsp;/g, ' ')
    .replace(/[#>]+/g, ' ')
    .replace(/[*`~]+/g, '')
    .replace(/(?:\s*·\s*)+/g, ' · ')
    .replace(/^\s*·\s*|\s*·\s*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function timestampedName(file: File): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
  return `print-${stamp}.${extension}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado';
}
