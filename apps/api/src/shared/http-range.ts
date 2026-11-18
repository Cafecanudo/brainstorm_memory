export interface ByteRange {
  start: number;
  end: number;
}

export type RangeResult = { kind: 'none' } | { kind: 'invalid' } | { kind: 'partial'; range: ByteRange };

export function parseRangeHeader(header: string | undefined, size: number): RangeResult {
  if (!header) return { kind: 'none' };

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return { kind: 'none' };

  const [, rawStart = '', rawEnd = ''] = match;
  if (rawStart === '' && rawEnd === '') return { kind: 'invalid' };

  if (size === 0) return { kind: 'invalid' };

  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (suffix === 0) return { kind: 'invalid' };
    return { kind: 'partial', range: { start: Math.max(size - suffix, 0), end: size - 1 } };
  }

  const start = Number(rawStart);
  const end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  if (start >= size || start > end) return { kind: 'invalid' };

  return { kind: 'partial', range: { start, end } };
}
