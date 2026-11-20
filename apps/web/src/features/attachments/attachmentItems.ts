import { api } from '../../api/client';
import type { Attachment } from '../../api/types';
import type { InlineImage } from '../../components/rich-text/types';
import type { AttachmentItem } from './AttachmentPanel';

export const toInlineImage = (attachment: Attachment): InlineImage => ({
  src: api.attachments.contentUrl(attachment.id),
  alt: attachment.originalName,
});

export function toAttachmentItem(attachment: Attachment, markdown: string): AttachmentItem {
  const src = api.attachments.contentUrl(attachment.id);
  return {
    key: attachment.id,
    kind: attachment.kind,
    name: attachment.originalName,
    sizeBytes: attachment.sizeBytes,
    src,
    downloadUrl: api.attachments.contentUrl(attachment.id, true),
    inText: markdown.includes(src),
  };
}
