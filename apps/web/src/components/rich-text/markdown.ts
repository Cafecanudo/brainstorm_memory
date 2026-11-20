export function normalizeMarkdown(markdown: string): string {
  return markdown.replace(/(\s*&nbsp;\s*)+$/, '').trimEnd();
}

export const CODE_LANGUAGES: [id: string, label: string][] = [
  ['plaintext', 'Texto simples'],
  ['bash', 'Bash / Terminal'],
  ['sql', 'SQL'],
  ['json', 'JSON'],
  ['yaml', 'YAML'],
  ['xml', 'XML / HTML'],
  ['java', 'Java'],
  ['kotlin', 'Kotlin'],
  ['typescript', 'TypeScript'],
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['rust', 'Rust'],
  ['go', 'Go'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['css', 'CSS'],
  ['ini', 'INI / .env'],
  ['diff', 'Diff'],
];

export const DEFAULT_CODE_LANGUAGE = 'bash';

export function languageLabel(language: string | null | undefined): string {
  if (!language || language === 'plaintext') return '';
  return CODE_LANGUAGES.find(([id]) => id === language)?.[1] ?? language;
}
