import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { StarterKit } from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { languageLabel } from './markdown';

const lowlight = createLowlight(common);

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

const CodeBlock = CodeBlockLowlight.extend({
  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language as string | null;
    return [
      'pre',
      { ...HTMLAttributes, 'data-lang': languageLabel(language) },
      ['code', { class: language ? `language-${language}` : null }, 0],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      let current = node;
      const dom = document.createElement('pre');
      const code = document.createElement('code');
      const copy = document.createElement('button');

      const apply = (target: typeof node) => {
        const language = target.attrs.language as string | null;
        dom.dataset.lang = languageLabel(language);
        code.className = language ? `language-${language}` : '';
      };

      copy.type = 'button';
      copy.contentEditable = 'false';
      copy.className = 'copy-code';
      copy.textContent = 'Copiar';
      copy.addEventListener('mousedown', (event) => event.preventDefault());
      copy.addEventListener('click', () => {
        void copyToClipboard(current.textContent).then(() => {
          copy.textContent = 'Copiado';
          window.setTimeout(() => (copy.textContent = 'Copiar'), 1200);
        });
      });

      apply(node);
      dom.append(copy, code);

      return {
        dom,
        contentDOM: code,
        update(updated) {
          if (updated.type !== current.type) return false;
          current = updated;
          apply(updated);
          return true;
        },
        stopEvent: (event) => event.target instanceof Node && copy.contains(event.target),
        ignoreMutation: (mutation) =>
          copy.contains(mutation.target) ||
          (mutation.type === 'attributes' && (mutation.target === dom || mutation.target === code)),
      };
    };
  },
});

interface ExtensionOptions {
  placeholder: string;
  readOnlyPlaceholder: string;
}

export function buildExtensions({ placeholder, readOnlyPlaceholder }: ExtensionOptions) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
    }),
    CodeBlock.configure({ lowlight, defaultLanguage: 'plaintext' }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({ nested: true, onReadOnlyChecked: () => true }),
    Image,
    Placeholder.configure({
      showOnlyWhenEditable: false,
      placeholder: ({ editor }) => (editor.isEditable ? placeholder : readOnlyPlaceholder),
    }),
    Markdown,
  ];
}
