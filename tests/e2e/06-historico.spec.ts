import { test, expect } from '@playwright/test';
import { abrirEditor, inserirAmbiente, evidenciar, ambientesNaBarra, projetoSalvo } from './apoio';

const AREA = '06-historico';

test.describe('Desfazer e refazer', () => {
  test('desfaz a inserção de um ambiente', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(() => ambientesNaBarra(page)).toBe(0);
    await evidenciar(page, AREA, 'apos-desfazer');
  });

  test('refaz o que foi desfeito', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(() => ambientesNaBarra(page)).toBe(0);

    await page.getByRole('button', { name: 'Refazer' }).click();
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);
    await evidenciar(page, AREA, 'apos-refazer');
  });

  test('Ctrl+Z e Ctrl+Y funcionam pelo teclado', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await canvas.click({ position: { x: 700, y: 500 } });

    await page.keyboard.press('Control+z');
    await expect.poll(() => ambientesNaBarra(page)).toBe(0);

    await page.keyboard.press('Control+y');
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);
  });

  test('renomear pelo painel vira UMA entrada de histórico, não uma por tecla', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    const painel = page.locator('.fixed.right-0.top-12');
    await painel.locator('input[type="text"]').fill('Cozinha');
    await expect.poll(async () => (await projetoSalvo(page))?.floors?.[0]?.rooms?.[0]?.name)
      .toBe('Cozinha');

    // Um único desfazer deve devolver o nome inteiro.
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(async () => (await projetoSalvo(page))?.floors?.[0]?.rooms?.[0]?.name)
      .toBe('Sala');
  });

  test('desfazer múltiplos ambientes na ordem inversa', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await inserirAmbiente(page, 'Cozinha', 3, 3);
    await expect.poll(() => ambientesNaBarra(page)).toBe(2);

    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);

    await expect.poll(async () => {
      const projeto = await projetoSalvo(page);
      return projeto.floors[0].rooms.map((r: any) => r.name);
    }).toEqual(['Sala']);
  });
});
