import type { ReactNode, Ref } from 'react';

export interface InlineImage {
  src: string;
  alt: string;
}

export interface RichTextEditorHandle {
  insertImage: (image: InlineImage) => void;
  removeImages: (src: string) => void;
  focus: () => void;
}

export interface RichTextEditorProps {
  ref?: Ref<RichTextEditorHandle>;
  value: string;
  onChange?: (markdown: string) => void;
  editable: boolean;
  placeholder: string;
  readOnlyPlaceholder?: string;
  ariaLabel: string;
  fill?: boolean;
  footer?: ReactNode;
  uploadImages?: (files: File[]) => Promise<InlineImage[]>;
  onRequestEdit?: () => void;
  onEscape?: () => void;
}
