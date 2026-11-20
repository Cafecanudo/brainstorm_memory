import { expect, test, type Page } from '@playwright/test';
import { createNote, createProject, uniqueName, uploadAttachment, type CreatedNote } from '../support/api';
import { holdButton, inTextBadge, noteEditor, openNote, pasteImage } from '../support/ui';

const getNote = async (page: Page, id: string) => {
  const response = await page.request.get(`/api/notes/${id}`);
  return { etag: response.headers()['etag'], note: (await response.json()) as CreatedNote & { attachments: { id: string }[] } };
};

const noteIdFromUrl = (page: Page) => /\/notes\/([0-9a-f-]{36})/.exec(page.url())?.[1] ?? '';

const list = (page: Page) => page.getByRole('region', { name: 'Lista de anotações' });

test.describe('anotações', () => {
  test('cria com N, salva sozinha e abre em modo leitura ao voltar', async ({ page }) => {
    const title = uniqueName('Anotação nova');
    await page.goto('/notes');
    await list(page).getByRole('link', { name: /Nova/ }).waitFor();
    await expect(async () => {
      await page.keyboard.press('n');
      await expect(page).toHaveURL(/\/notes\/new/, { timeout: 1000 });
    }).toPass();

    await page.getByLabel('Título da anotação').fill(title);
    await page.keyboard.press('Enter');
    await page.keyboard.type('Primeira linha da anotação');
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}/);

    const id = noteIdFromUrl(page);
    const { note } = await getNote(page, id);
    expect(note).toMatchObject({ title, body: 'Primeira linha da anotação', projectId: null });

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /Editar/ })).toBeVisible();
    await expect(noteEditor(page)).toHaveAttribute('contenteditable', 'false');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(noteEditor(page)).toContainText('Primeira linha da anotação');
    await expect(page.getByRole('toolbar', { name: 'Formatação' })).toHaveCount(0);
  });

  test('anotação nova dentro de um projeto já nasce nele', async ({ page, request }) => {
    const project = await createProject(request);
    await page.goto(`/notes?project=${project.id}`);
    await list(page).getByRole('link', { name: /Nova/ }).click();
    await page.getByLabel('Título da anotação').waitFor();
    await page.getByLabel('Título da anotação').fill(uniqueName('No projeto'));
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

    const { note } = await getNote(page, noteIdFromUrl(page));
    expect(note.projectId).toBe(project.id);
    await expect(page.getByLabel('Projeto da anotação')).toHaveValue(project.id);
  });

  test('rascunho vazio é descartado ao sair da edição', async ({ page, request }) => {
    const before = (await (await request.get('/api/notes/counts')).json()) as { total: number };
    const project = await createProject(request);
    await page.goto(`/notes/new?project=${project.id}`);
    await expect(page.getByText(/Rascunho/)).toBeVisible();
    await page.getByLabel('Título da anotação').press('Escape');
    await expect(page).toHaveURL(new RegExp(`/notes\\?project=${project.id}$`));
    const notes = (await (await request.get(`/api/notes?projectId=${project.id}`)).json()) as unknown[];
    expect(notes).toHaveLength(0);
    expect(((await (await request.get('/api/notes/counts')).json()) as { total: number }).total).toBeGreaterThanOrEqual(before.total);
  });

  test('alterna leitura e edição com E, Esc e dois cliques sem alterar a anotação', async ({ page, request }) => {
    const note = await createNote(request, { body: '## Seção\n\nTexto para ler' });
    await openNote(page, `/notes/${note.id}`);
    await expect(noteEditor(page)).toHaveAttribute('contenteditable', 'false');

    await page.keyboard.press('e');
    await expect(noteEditor(page)).toHaveAttribute('contenteditable', 'true');
    await expect(page.getByRole('toolbar', { name: 'Formatação' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(noteEditor(page)).toHaveAttribute('contenteditable', 'false');

    await noteEditor(page).getByText('Texto para ler').dblclick();
    await expect(noteEditor(page)).toHaveAttribute('contenteditable', 'true');
    await page.getByRole('button', { name: /Concluir/ }).click();
    await expect(page.getByRole('button', { name: /Editar/ })).toBeVisible();

    await page.waitForTimeout(1000);
    const { etag, note: saved } = await getNote(page, note.id);
    expect(etag).toBe('"1"');
    expect(saved.body).toBe('## Seção\n\nTexto para ler');
  });

  test('bloco de código pelo menu / com linguagem e botão Copiar na leitura', async ({ page, request, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const note = await createNote(request);
    await openNote(page, `/notes/${note.id}`);
    await page.getByRole('button', { name: /Editar/ }).click();

    await noteEditor(page).click();
    await page.keyboard.type('/cod');
    await page.keyboard.press('Enter');
    await page.keyboard.type('select count(*) from notes;');
    await page.getByLabel('Linguagem do bloco de código').selectOption('sql');
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();

    const { note: saved } = await getNote(page, note.id);
    expect(saved.body).toBe('```sql\nselect count(*) from notes;\n```');

    await page.keyboard.press('Escape');
    const copy = noteEditor(page).locator('.copy-code');
    await noteEditor(page).locator('pre').hover();
    await copy.click();
    await expect(copy).toHaveText('Copiado');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('select count(*) from notes;');
  });

  test('caixas de tarefa podem ser marcadas no modo leitura', async ({ page, request }) => {
    const note = await createNote(request, { body: '- [ ] conferir backup' });
    await openNote(page, `/notes/${note.id}`);
    await noteEditor(page).getByRole('checkbox').check();
    await expect.poll(async () => (await getNote(page, note.id)).note.body).toBe('- [x] conferir backup');
  });

  test('print colado no texto entra como anexo e imagem; fora do texto só anexa', async ({ page, request }) => {
    const note = await createNote(request, { body: 'Antes do print' });
    await openNote(page, `/notes/${note.id}`);
    await page.keyboard.press('e');

    await noteEditor(page).click();
    await page.keyboard.press('Control+End');
    await pasteImage(noteEditor(page));
    await expect(noteEditor(page).locator('img')).toHaveAttribute('src', /\/api\/attachments\/.+\/content/);
    await expect(inTextBadge(page)).toBeVisible();

    await pasteImage(page.getByLabel('Título da anotação'), '#6f2f4f');
    await expect.poll(async () => (await getNote(page, note.id)).note.attachments.length).toBe(2);
    await expect(inTextBadge(page)).toHaveCount(1);

    await expect.poll(async () => (await getNote(page, note.id)).note.body).toMatch(/!\[print-.+\]\(\/api\/attachments\/.+\/content\)/);
  });

  test('remover anexo segurando 3 s tira a imagem do texto', async ({ page, request }) => {
    const note = await createNote(request);
    const attachment = await uploadAttachment(request, 'notes', note.id, 'print-remover.png');
    const src = `/api/attachments/${attachment.id}/content`;
    await request.patch(`/api/notes/${note.id}`, { data: { body: `![print-remover.png](${src})` }, headers: { 'If-Match': '"1"' } });

    await openNote(page, `/notes/${note.id}`);
    await page.keyboard.press('e');
    await expect(noteEditor(page).locator('img')).toHaveCount(1);

    const tile = page.getByRole('region', { name: 'Anexos' }).getByRole('listitem').filter({ hasText: 'print-remover.png' });
    await tile.hover();
    await holdButton(page, tile.getByRole('button', { name: /Segure 3 s para remover/ }));

    await expect(noteEditor(page).locator('img')).toHaveCount(0);
    await expect.poll(async () => (await getNote(page, note.id)).note.attachments.length).toBe(0);
    await expect.poll(async () => (await getNote(page, note.id)).note.body).toBe('');
  });

  test('conflito entre abas mostra o aviso e permite recarregar a outra versão', async ({ page, context, request }) => {
    const note = await createNote(request, { body: 'Versão inicial' });
    const other = await context.newPage();

    await openNote(page, `/notes/${note.id}`);
    await openNote(other, `/notes/${note.id}`);

    await other.keyboard.press('e');
    await noteEditor(other).click();
    await other.keyboard.press('Control+End');
    await other.keyboard.type(' editada na outra aba');
    await expect(other.getByText('Salvo', { exact: true })).toBeVisible();

    await page.keyboard.press('e');
    await noteEditor(page).click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' minha mudança');

    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Esta anotação foi alterada em outra aba');
    await alert.getByRole('button', { name: 'Descartar as minhas e recarregar' }).click();
    await expect(alert).toHaveCount(0);
    await expect(noteEditor(page)).toContainText('Versão inicial editada na outra aba');
    await expect(noteEditor(page)).not.toContainText('minha mudança');
  });

  test('conflito entre abas permite manter as minhas alterações', async ({ page, context, request }) => {
    const note = await createNote(request, { body: 'Base' });
    const other = await context.newPage();
    await openNote(page, `/notes/${note.id}`);
    await openNote(other, `/notes/${note.id}`);

    await other.keyboard.press('e');
    await noteEditor(other).click();
    await other.keyboard.press('Control+End');
    await other.keyboard.type(' da outra');
    await expect(other.getByText('Salvo', { exact: true })).toBeVisible();

    await page.keyboard.press('e');
    await noteEditor(page).click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type(' minha');
    await page.getByRole('alert').getByRole('button', { name: 'Manter as minhas' }).click();
    await expect(page.getByText('Salvo', { exact: true })).toBeVisible();
    await expect.poll(async () => (await getNote(page, note.id)).note.body).toBe('Base minha');
  });

  test('excluir exige segurar 3 s; soltar antes cancela', async ({ page, request }) => {
    const note = await createNote(request, { title: uniqueName('Para excluir') });
    await openNote(page, `/notes/${note.id}`);
    const button = page.getByRole('button', { name: 'Segure 3 s para excluir a anotação' });

    await holdButton(page, button, 1000);
    expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(200);

    await holdButton(page, button);
    await expect.poll(async () => (await request.get(`/api/notes/${note.id}`)).status()).toBe(404);
    await expect(list(page).getByRole('link', { name: new RegExp(note.title) })).toHaveCount(0);
  });

  test('busca filtra a lista e fixadas aparecem primeiro', async ({ page, request }) => {
    const project = await createProject(request);
    const marker = uniqueName('marcador').replace(' ', '-');
    const pinned = await createNote(request, { projectId: project.id, title: `Fixada ${marker}`, pinned: true });
    await createNote(request, { projectId: project.id, title: `Comum ${marker}` });
    await createNote(request, { projectId: project.id, title: 'Outra qualquer' });

    await page.goto(`/notes?project=${project.id}`);
    await expect(list(page).getByText('Fixadas')).toBeVisible();
    await expect(list(page).getByRole('navigation').getByRole('link').first()).toContainText(pinned.title);

    await list(page).getByPlaceholder('Buscar em título, texto e tags').fill(marker);
    await expect(page).toHaveURL(new RegExp(`q=${marker}`));
    await expect(list(page).getByRole('link', { name: /Outra qualquer/ })).toHaveCount(0);
    await expect(list(page).getByText('2 anotações')).toBeVisible();
  });
});
