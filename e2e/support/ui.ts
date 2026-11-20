import type { Locator, Page } from '@playwright/test';

export async function holdButton(page: Page, button: Locator, milliseconds = 3300) {
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(milliseconds);
  await page.mouse.up();
}

export async function pasteImage(target: Locator, color = '#2f6f4f') {
  await target.evaluate(async (element, fill) => {
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 60;
    const context = canvas.getContext('2d')!;
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((value) => resolve(value!), 'image/png'));
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], 'image.png', { type: 'image/png' }));
    if (element instanceof HTMLElement) element.focus();
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  }, color);
}

export const noteEditor = (page: Page) => page.getByRole('textbox', { name: 'Texto da anotação' });

export const ideaEditor = (page: Page) => page.getByRole('textbox', { name: 'Descrição da ideia' });

export async function openNote(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole('button', { name: /Editar|Concluir/ }).waitFor();
  await noteEditor(page).waitFor();
}

export const inTextBadge = (page: Page) => page.getByTitle('Esta imagem está no texto');
