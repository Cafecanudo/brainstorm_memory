import { expect, test } from '@playwright/test';
import { createIdea, createNote, createProject, uniqueName, uniqueTag, type CreatedNote } from '../support/api';

test.describe('API de anotações', () => {
  test('cria sem projeto com valores padrão, ETag e Location', async ({ request }) => {
    const response = await request.post('/api/notes', { data: { body: 'Só o texto' } });

    expect(response.status()).toBe(201);
    const note = (await response.json()) as CreatedNote;
    expect(note).toMatchObject({ projectId: null, title: '', body: 'Só o texto', tags: [], pinned: false, version: 1 });
    expect(response.headers()['etag']).toBe('"1"');
    expect(response.headers()['location']).toBe(`/api/notes/${note.id}`);
  });

  test('normaliza título e tags', async ({ request }) => {
    const note = await createNote(request, { title: '  Comandos  ', tags: ['Docker', 'docker', ' CLI '] });
    expect(note.title).toBe('Comandos');
    expect(note.tags).toEqual(['docker', 'cli']);
  });

  test('rejeita projeto inexistente', async ({ request }) => {
    const response = await request.post('/api/notes', {
      data: { projectId: '00000000-0000-4000-8000-000000000000', title: 'x' },
    });
    expect(response.status()).toBe(422);
  });

  test('filtra por projeto, sem projeto, busca e tag', async ({ request }) => {
    const project = await createProject(request);
    const marker = uniqueTag('marcador');
    const inProject = await createNote(request, { projectId: project.id, body: `texto ${marker}` });
    const loose = await createNote(request, { title: `Solta ${marker}` });
    const tagged = await createNote(request, { tags: [marker] });

    const byProject = (await (await request.get(`/api/notes?projectId=${project.id}`)).json()) as CreatedNote[];
    expect(byProject.map((note) => note.id)).toEqual([inProject.id]);

    const unassigned = (await (await request.get('/api/notes?projectId=none')).json()) as CreatedNote[];
    expect(unassigned.map((note) => note.id)).toEqual(expect.arrayContaining([loose.id, tagged.id]));
    expect(unassigned.every((note) => note.projectId === null)).toBe(true);

    const search = (await (await request.get(`/api/notes?q=${marker}`)).json()) as CreatedNote[];
    expect(search.map((note) => note.id).sort()).toEqual([inProject.id, loose.id, tagged.id].sort());

    const byTag = (await (await request.get(`/api/notes?tag=${marker}`)).json()) as CreatedNote[];
    expect(byTag.map((note) => note.id)).toEqual([tagged.id]);
  });

  test('lista fixadas primeiro e depois pela atualização mais recente', async ({ request }) => {
    const project = await createProject(request);
    const older = await createNote(request, { projectId: project.id });
    const pinned = await createNote(request, { projectId: project.id, pinned: true });
    const newer = await createNote(request, { projectId: project.id });

    const list = (await (await request.get(`/api/notes?projectId=${project.id}`)).json()) as (CreatedNote & {
      excerpt: string;
      projectName: string;
    })[];
    expect(list.map((note) => note.id)).toEqual([pinned.id, newer.id, older.id]);
    expect(list[0]).toMatchObject({ projectName: project.name });
    expect(list[0]).not.toHaveProperty('body');
  });

  test('PATCH exige If-Match, incrementa a versão e recusa versão antiga', async ({ request }) => {
    const note = await createNote(request);

    const missing = await request.patch(`/api/notes/${note.id}`, { data: { body: 'a' } });
    expect(missing.status()).toBe(428);

    const first = await request.patch(`/api/notes/${note.id}`, { data: { body: 'a' }, headers: { 'If-Match': '"1"' } });
    expect(first.status()).toBe(200);
    expect(first.headers()['etag']).toBe('"2"');
    expect(await first.json()).toMatchObject({ body: 'a', version: 2 });

    const stale = await request.patch(`/api/notes/${note.id}`, { data: { body: 'b' }, headers: { 'If-Match': '"1"' } });
    expect(stale.status()).toBe(412);
    const problem = (await stale.json()) as { message: string; details: { current: CreatedNote } };
    expect(problem.details.current).toMatchObject({ id: note.id, body: 'a', version: 2 });

    const after = await request.get(`/api/notes/${note.id}`);
    expect(after.headers()['etag']).toBe('"2"');
    expect(await after.json()).toMatchObject({ body: 'a' });
  });

  test('move a anotação para um projeto e de volta para sem projeto', async ({ request }) => {
    const project = await createProject(request);
    const note = await createNote(request);

    const moved = await request.patch(`/api/notes/${note.id}`, {
      data: { projectId: project.id },
      headers: { 'If-Match': '"1"' },
    });
    expect(await moved.json()).toMatchObject({ projectId: project.id, projectName: project.name, version: 2 });

    const back = await request.patch(`/api/notes/${note.id}`, { data: { projectId: null }, headers: { 'If-Match': '"2"' } });
    expect(await back.json()).toMatchObject({ projectId: null, projectName: null, version: 3 });
  });

  test('exclui e responde 404 depois', async ({ request }) => {
    const note = await createNote(request);
    expect((await request.delete(`/api/notes/${note.id}`)).status()).toBe(204);
    expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(404);
    expect((await request.delete(`/api/notes/${note.id}`)).status()).toBe(404);
  });

  test('contagens refletem anotações sem projeto', async ({ request }) => {
    await createNote(request);
    const counts = (await (await request.get('/api/notes/counts')).json()) as { total: number; unassigned: number };
    expect(counts.unassigned).toBeGreaterThanOrEqual(1);
    expect(counts.total).toBeGreaterThanOrEqual(counts.unassigned);
  });

  test('projetos trazem a contagem de anotações e anexos, e a exclusão apaga as anotações', async ({ request }) => {
    const project = await createProject(request, uniqueName('Projeto com notas'));
    await createIdea(request, { projectId: project.id });
    const note = await createNote(request, { projectId: project.id });
    await createNote(request, { projectId: project.id });

    const projects = (await (await request.get('/api/projects')).json()) as {
      id: string;
      ideaCount: number;
      noteCount: number;
      attachmentCount: number;
    }[];
    expect(projects.find((item) => item.id === project.id)).toMatchObject({ ideaCount: 1, noteCount: 2, attachmentCount: 0 });

    expect((await request.delete(`/api/projects/${project.id}`)).status()).toBe(204);
    expect((await request.get(`/api/notes/${note.id}`)).status()).toBe(404);
  });

  test('GET /api/tags junta tags de ideias e anotações', async ({ request }) => {
    const project = await createProject(request);
    const ideaTag = uniqueTag('a-ideia');
    const noteTag = uniqueTag('b-nota');
    await createIdea(request, { projectId: project.id, tags: [ideaTag] });
    await createNote(request, { projectId: project.id, tags: [noteTag, ideaTag] });

    expect(await (await request.get(`/api/tags?projectId=${project.id}`)).json()).toEqual([ideaTag, noteTag]);
    expect(await (await request.get(`/api/tags?projectId=${project.id}&kind=idea`)).json()).toEqual([ideaTag]);
    expect(await (await request.get(`/api/tags?projectId=${project.id}&kind=note`)).json()).toEqual([ideaTag, noteTag]);
    expect((await request.get('/api/tags?kind=outro')).status()).toBe(400);
  });

  test('filtro de tags da lista de ideias não mostra tags que só existem em anotações', async ({ page, request }) => {
    const project = await createProject(request);
    const ideaTag = uniqueTag('so-ideia');
    const noteTag = uniqueTag('so-nota');
    await createIdea(request, { projectId: project.id, tags: [ideaTag] });
    await createNote(request, { projectId: project.id, tags: [noteTag] });

    await page.goto('/');
    await expect(page.getByRole('button', { name: `#${ideaTag}` })).toBeVisible();
    await expect(page.getByRole('button', { name: `#${noteTag}` })).toHaveCount(0);
  });
});
