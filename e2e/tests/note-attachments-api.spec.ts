import { expect, test } from '@playwright/test';
import { createIdea, createNote, createProject, uploadAttachment, type CreatedAttachment } from '../support/api';

test.describe('API de anexos de anotações', () => {
  test('envia, lista no detalhe e serve o conteúdo', async ({ request }) => {
    const note = await createNote(request);
    const attachment = await uploadAttachment(request, 'notes', note.id, 'print-anotacao.png');
    expect(attachment).toMatchObject({ kind: 'image', originalName: 'print-anotacao.png' });

    const detail = (await (await request.get(`/api/notes/${note.id}`)).json()) as { attachments: CreatedAttachment[] };
    expect(detail.attachments.map((item) => item.id)).toEqual([attachment.id]);

    const content = await request.get(`/api/attachments/${attachment.id}/content`);
    expect(content.status()).toBe(200);
    expect(content.headers()['content-type']).toBe('image/png');
  });

  test('anexar e remover não mudam a versão da anotação', async ({ request }) => {
    const note = await createNote(request);
    const attachment = await uploadAttachment(request, 'notes', note.id);
    expect((await request.delete(`/api/attachments/${attachment.id}`)).status()).toBe(204);

    const response = await request.get(`/api/notes/${note.id}`);
    expect(response.headers()['etag']).toBe('"1"');
    expect(await response.json()).toMatchObject({ version: 1, attachments: [] });
  });

  test('recusa anotação inexistente', async ({ request }) => {
    const response = await request.post('/api/notes/00000000-0000-4000-8000-000000000000/attachments', {
      multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('x') } },
    });
    expect(response.status()).toBe(404);
  });

  test('excluir a anotação apaga os anexos', async ({ request }) => {
    const note = await createNote(request);
    const attachment = await uploadAttachment(request, 'notes', note.id);
    expect((await request.delete(`/api/notes/${note.id}`)).status()).toBe(204);
    expect((await request.get(`/api/attachments/${attachment.id}/content`)).status()).toBe(404);
  });

  test('projeto conta anexos de ideias e anotações e apaga todos ao ser excluído', async ({ request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id });
    const note = await createNote(request, { projectId: project.id });
    const fromIdea = await uploadAttachment(request, 'ideas', idea.id);
    const fromNote = await uploadAttachment(request, 'notes', note.id);

    const projects = (await (await request.get('/api/projects')).json()) as { id: string; attachmentCount: number }[];
    expect(projects.find((item) => item.id === project.id)?.attachmentCount).toBe(2);

    expect((await request.delete(`/api/projects/${project.id}`)).status()).toBe(204);
    expect((await request.get(`/api/attachments/${fromIdea.id}/content`)).status()).toBe(404);
    expect((await request.get(`/api/attachments/${fromNote.id}/content`)).status()).toBe(404);
  });
});
