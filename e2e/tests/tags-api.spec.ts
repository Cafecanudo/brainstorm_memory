import { expect, test } from '@playwright/test';
import { createIdea, createProject, uniqueTag } from '../support/api';

test.describe('GET /api/tags', () => {
  test('lista as tags das ideias, sem repetição e em ordem', async ({ request }) => {
    const project = await createProject(request);
    const first = uniqueTag('a-api');
    const second = uniqueTag('b-api');
    await createIdea(request, { projectId: project.id, tags: [second, first] });
    await createIdea(request, { projectId: project.id, tags: [first] });

    const response = await request.get(`/api/tags?projectId=${project.id}`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual([first, second]);
  });

  test('sem filtro inclui tags de todos os projetos', async ({ request }) => {
    const tagA = uniqueTag('proj-a');
    const tagB = uniqueTag('proj-b');
    await createIdea(request, { projectId: (await createProject(request)).id, tags: [tagA] });
    await createIdea(request, { projectId: (await createProject(request)).id, tags: [tagB] });

    const tags = (await (await request.get('/api/tags')).json()) as string[];
    expect(tags).toEqual(expect.arrayContaining([tagA, tagB]));
  });
});
