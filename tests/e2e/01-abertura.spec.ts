import { test, expect } from '@playwright/test';
import { abrirEditor, evidenciar, contarPixeis } from './apoio';

const AREA = '01-abertura';

test.describe('Abertura do editor', () => {
  test('carrega sem erro de runtime e desenha o canvas', async ({ page }) => {
    const { canvas, erros } = await abrirEditor(page);

    await expect(canvas).toBeVisible();
    expect(erros, `erros no console:\n${erros.join('\n')}`).toEqual([]);

    const { pintados } = await contarPixeis(canvas);
    expect(pintados, 'o canvas não desenhou nada').toBeGreaterThan(0);

    await evidenciar(page, AREA, 'editor-vazio');
  });

  test('cria projeto novo e corrige a URL com o id', async ({ page }) => {
    await abrirEditor(page);
    await expect(page).toHaveURL(/\/editor\?id=/);
  });

  test('salva o projeto no localStorage', async ({ page }) => {
    await abrirEditor(page);
    await expect.poll(() =>
      page.evaluate(() => localStorage.getItem('floorplan_projects')),
    ).toBeTruthy();
  });

  test('mostra o estado vazio até existir alguma parede', async ({ page }) => {
    await abrirEditor(page);
    await expect(page.getByText('Comece a planta da sua casa')).toBeVisible();
  });
});
