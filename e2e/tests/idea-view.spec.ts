import { expect, test } from '@playwright/test';
import { createIdea, createProject, uniqueName } from '../support/api';
import { holdButton, ideaEditor } from '../support/ui';

const getIdea = async (request: import('@playwright/test').APIRequestContext, id: string) =>
  (await (await request.get(`/api/ideas/${id}`)).json()) as { title: string; description: string; status: string; priority: string };

test.describe('visualização da ideia', () => {
  test('o card abre a visualização; editar e salvar voltam para ela; Voltar vai para a lista', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id, description: 'Texto da ideia', tags: ['leitura'] });

    await page.goto(`/?project=${project.id}`);
    await page.getByRole('link', { name: new RegExp(idea.title) }).click();
    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: idea.title })).toBeVisible();
    await expect(ideaEditor(page)).toHaveAttribute('contenteditable', 'false');
    await expect(ideaEditor(page)).toContainText('Texto da ideia');
    await expect(page.getByText('#leitura', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Título da ideia')).toHaveCount(0);

    await page.getByRole('link', { name: /Editar/ }).click();
    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}/edit$`));
    const title = `${idea.title} revisada`;
    await page.getByPlaceholder('Título da ideia').fill(title);
    await page.keyboard.press('Control+s');

    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();

    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page).toHaveURL(new RegExp(`\\?project=${project.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible();
  });

  test('status e prioridade mudam na hora na visualização', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id });

    await page.goto(`/ideas/${idea.id}`);
    await page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Feito' }).click();
    await page.getByRole('group', { name: 'Prioridade' }).getByRole('button', { name: 'Alta' }).click();

    await expect.poll(async () => (await getIdea(request, idea.id)).status).toBe('done');
    await expect.poll(async () => (await getIdea(request, idea.id)).priority).toBe('high');
    await expect(page.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Feito' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('E e dois cliques abrem a edição; Voltar da edição volta à visualização sem salvar', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id, description: 'Clique duas vezes aqui' });

    await page.goto(`/ideas/${idea.id}`);
    await expect(ideaEditor(page)).toContainText('Clique duas vezes aqui');
    await page.keyboard.press('e');
    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}/edit$`));

    await page.getByPlaceholder('Título da ideia').fill(uniqueName('Não salvar'));
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: idea.title })).toBeVisible();

    await ideaEditor(page).getByText('Clique duas vezes aqui').dblclick();
    await expect(page).toHaveURL(new RegExp(`/ideas/${idea.id}/edit$`));
    expect((await getIdea(request, idea.id)).title).toBe(idea.title);
  });

  test('excluir exige segurar 3 s; soltar antes cancela', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id });

    await page.goto(`/ideas/${idea.id}`);
    const button = page.getByRole('button', { name: 'Segure 3 s para excluir a ideia' });
    await holdButton(page, button, 1000);
    expect((await request.get(`/api/ideas/${idea.id}`)).status()).toBe(200);

    await holdButton(page, button);
    await expect(page).toHaveURL(new RegExp(`\\?project=${project.id}$`));
    expect((await request.get(`/api/ideas/${idea.id}`)).status()).toBe(404);
  });
});
