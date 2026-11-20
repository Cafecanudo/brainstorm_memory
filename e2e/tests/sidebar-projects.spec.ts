import { expect, test } from '@playwright/test';
import { createIdea, createNote, createProject, uploadAttachment } from '../support/api';
import { holdButton } from '../support/ui';

test.describe('barra lateral e projetos', () => {
  test('filtra ideias pelo projeto e mostra a contagem em aberto', async ({ page, request }) => {
    const project = await createProject(request);
    const open = await createIdea(request, { projectId: project.id });
    await createIdea(request, { projectId: project.id });
    const done = await createIdea(request, { projectId: project.id });
    await request.patch(`/api/ideas/${done.id}`, { data: { status: 'done' } });

    await page.goto('/');
    const projectLink = page.locator('aside').getByRole('link', { name: new RegExp(project.name) });
    await expect(projectLink).toContainText('2');

    await projectLink.click();
    await expect(page).toHaveURL(new RegExp(`\\?project=${project.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible();
    await expect(page.getByText('3 ideias')).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(open.title) })).toBeVisible();

    await page.locator('aside').getByRole('link', { name: /^Ideias/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Todas as ideias' })).toBeVisible();
  });

  test('o item da seção fica selecionado em qualquer tela dela', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id });
    const note = await createNote(request, { projectId: project.id });
    const aside = page.locator('aside');
    const ideas = aside.getByRole('link', { name: /^Ideias/ });
    const notes = aside.getByRole('link', { name: /^Anotações/ });

    for (const path of ['/', `/?project=${project.id}`, `/ideas/${idea.id}`, '/ideas/new']) {
      await page.goto(path);
      await expect(ideas).toHaveAttribute('aria-current', 'page');
      await expect(notes).not.toHaveAttribute('aria-current', 'page');
    }

    for (const path of ['/notes', `/notes?project=${project.id}`, `/notes/${note.id}`, '/notes/new']) {
      await page.goto(path);
      await expect(notes).toHaveAttribute('aria-current', 'page');
      await expect(ideas).not.toHaveAttribute('aria-current', 'page');
    }
  });

  test('na seção de anotações, os projetos mostram a contagem de anotações', async ({ page, request }) => {
    const project = await createProject(request);
    await createNote(request, { projectId: project.id });
    await createNote(request, { projectId: project.id });

    await page.goto('/notes');
    const projectLink = page.locator('aside').getByRole('link', { name: new RegExp(project.name) });
    await expect(projectLink).toContainText('2');
    await projectLink.click();
    await expect(page).toHaveURL(new RegExp(`/notes/[^?]+\\?project=${project.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible();
    await expect(page.getByText('2 anotações')).toBeVisible();
  });

  test('excluir projeto mostra as contagens e exige segurar o botão', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id });
    const note = await createNote(request, { projectId: project.id });
    await uploadAttachment(request, 'ideas', idea.id);

    await page.goto(`/?project=${project.id}`);
    const row = page.locator('aside .group', { hasText: project.name });
    await row.hover();
    await row.getByTitle('Excluir').click();

    const card = page.getByRole('dialog', { name: `Excluir ${project.name}` });
    await expect(card).toContainText('1 ideia');
    await expect(card).toContainText('1 anotação');
    await expect(card).toContainText('1 anexo no total');
    await expect(card).toContainText('Não é possível recuperar depois.');

    const button = card.getByRole('button', { name: `Segure 3 s para excluir ${project.name}` });
    await holdButton(page, button, 1000);
    await expect(card).toBeVisible();

    await holdButton(page, button);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('aside').getByRole('link', { name: new RegExp(project.name) })).toHaveCount(0);
    expect((await request.get(`/api/ideas/${idea.id}`)).status()).toBe(404);
    expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(404);
  });

  test('cancelar a exclusão mantém o projeto', async ({ page, request }) => {
    const project = await createProject(request);
    await page.goto('/');
    const row = page.locator('aside .group', { hasText: project.name });
    await row.hover();
    await row.getByTitle('Excluir').click();
    await page.getByRole('dialog', { name: `Excluir ${project.name}` }).getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('aside').getByRole('link', { name: new RegExp(project.name) })).toBeVisible();
  });
});
