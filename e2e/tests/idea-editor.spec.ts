import { expect, test } from '@playwright/test';
import { createIdea, createProject, uniqueName, uniqueTag } from '../support/api';
import { ideaEditor, inTextBadge, pasteImage } from '../support/ui';

test.describe('editor de ideias', () => {
  test('cria ideia com descrição formatada e tags, e reabre com o conteúdo', async ({ page, request }) => {
    const project = await createProject(request);
    const title = uniqueName('Ideia com editor');

    await page.goto(`/ideas/new?project=${project.id}`);
    await page.getByPlaceholder('Título da ideia').fill(title);

    const editor = ideaEditor(page);
    await editor.click();
    await page.keyboard.type('## Objetivo');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Texto com ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('negrito');
    await expect(editor.getByRole('heading', { name: 'Objetivo' })).toBeVisible();
    await expect(editor.locator('strong', { hasText: 'negrito' })).toBeVisible();

    const tagInput = page.getByPlaceholder('Adicionar tag');
    await tagInput.fill('rust');
    await tagInput.press('Enter');
    const tagField = page.locator('input[list]');
    await tagField.pressSequentially('dsp,');
    await tagField.pressSequentially('ui ');
    await expect(page.getByTitle('Remover rust')).toBeVisible();
    await expect(page.getByTitle('Remover dsp')).toBeVisible();
    await expect(page.getByTitle('Remover ui')).toBeVisible();

    await tagField.press('Backspace');
    await expect(page.getByTitle('Remover ui')).toHaveCount(0);

    await page.keyboard.press('Control+s');
    await expect(page).toHaveURL(new RegExp(`\\?project=${project.id}$`));
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible();

    const ideas = (await (await request.get(`/api/ideas?projectId=${project.id}`)).json()) as { id: string }[];
    const saved = (await (await request.get(`/api/ideas/${ideas[0]!.id}`)).json()) as { description: string };
    expect(saved.description).toBe('## Objetivo\n\nTexto com **negrito**');

    await page.getByRole('link', { name: new RegExp(title) }).click();
    await expect(ideaEditor(page).getByRole('heading', { name: 'Objetivo' })).toBeVisible();
    await expect(page.getByTitle('Remover rust')).toBeVisible();
    await expect(page.getByTitle('Remover dsp')).toBeVisible();
  });

  test('menu / insere bloco de código com a linguagem escolhida', async ({ page, request }) => {
    const project = await createProject(request);
    await page.goto(`/ideas/new?project=${project.id}`);
    await page.getByPlaceholder('Título da ideia').fill(uniqueName('Ideia com código'));

    await ideaEditor(page).click();
    await page.keyboard.type('/cod');
    await page.getByRole('option', { name: /Bloco de código/ }).click();
    await page.keyboard.type('select 1;');
    await page.getByLabel('Linguagem do bloco de código').selectOption('sql');
    await page.getByRole('button', { name: 'Markdown' }).click();
    await expect(page.getByLabel('Descrição da ideia em Markdown')).toHaveValue('```sql\nselect 1;\n```');
  });

  test('sugere tags já usadas', async ({ page, request }) => {
    const project = await createProject(request);
    const tag = uniqueTag('sugestao');
    await createIdea(request, { projectId: project.id, tags: [tag] });

    await page.goto(`/ideas/new?project=${project.id}`);
    await expect(page.locator(`datalist option[value="${tag}"]`)).toHaveCount(1);
  });

  test('alterações não salvas aparecem no cabeçalho', async ({ page, request }) => {
    const project = await createProject(request);
    const idea = await createIdea(request, { projectId: project.id, description: 'Texto' });

    await page.goto(`/ideas/${idea.id}`);
    await expect(ideaEditor(page)).toContainText('Texto');
    await expect(page.getByText('Alterações não salvas')).toHaveCount(0);
    await page.getByPlaceholder('Título da ideia').fill(`${idea.title} editada`);
    await expect(page.getByText('Alterações não salvas')).toBeVisible();
  });

  test('print colado no texto de uma ideia nova vira anexo com endereço definitivo', async ({ page, request }) => {
    const project = await createProject(request);
    const title = uniqueName('Ideia com print');
    await page.goto(`/ideas/new?project=${project.id}`);
    await page.getByPlaceholder('Título da ideia').fill(title);

    await ideaEditor(page).click();
    await pasteImage(ideaEditor(page));
    await expect(ideaEditor(page).locator('img')).toHaveAttribute('src', /^blob:/);
    await expect(inTextBadge(page)).toBeVisible();

    await page.getByRole('button', { name: /Criar ideia/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible();

    const ideas = (await (await request.get(`/api/ideas?projectId=${project.id}`)).json()) as { id: string }[];
    const saved = (await (await request.get(`/api/ideas/${ideas[0]!.id}`)).json()) as {
      description: string;
      attachments: { id: string }[];
    };
    expect(saved.attachments).toHaveLength(1);
    expect(saved.description).toContain(`/api/attachments/${saved.attachments[0]!.id}/content`);
    expect(saved.description).not.toContain('blob:');
  });
});
