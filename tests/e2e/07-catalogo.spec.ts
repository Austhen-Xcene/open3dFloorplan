import { test, expect } from '@playwright/test';
import { abrirEditor, evidenciar } from './apoio';

const AREA = '07-catalogo';

test.describe('Painel de construção', () => {
  test('aba Construir lista portas e janelas', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Construir', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Portas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Janelas' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simples/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Maxim-ar/ })).toBeVisible();

    await evidenciar(page.locator('.w-64').first(), AREA, 'aba-construir');
  });

  test('escolher uma porta ativa a ferramenta', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Construir', exact: true }).click();
    await page.getByRole('button', { name: /Dupla/ }).click();
    await expect(page.getByRole('button', { name: /Dupla/ })).toHaveClass(/border-blue-400/);
    await evidenciar(page.locator('.w-64').first(), AREA, 'porta-selecionada');
  });

  test('aba Objetos mostra o catálogo com miniatura 2D', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();

    const grade = page.locator('.grid.grid-cols-2').last();
    await expect(grade.locator('button')).not.toHaveCount(0);
    // A miniatura é gerada do símbolo 2D, em data URL — sem rede, sem GLB.
    const src = await grade.locator('img').first().getAttribute('src');
    expect(src).toMatch(/^data:image\/png;base64,/);

    await evidenciar(page.locator('.w-64').first(), AREA, 'aba-objetos');
  });

  test('busca filtra e mostra a contagem', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();
    await page.getByPlaceholder('Buscar no catálogo…').fill('sofa');

    await expect(page.getByText(/resultados? para "sofa"/)).toBeVisible();
    await evidenciar(page.locator('.w-64').first(), AREA, 'busca');

    await page.getByRole('button', { name: 'Limpar busca' }).click();
    await expect(page.getByText(/resultados? para/)).toBeHidden();
  });

  test('favoritar move o item para a categoria Favoritos', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();

    await page.getByTitle('Adicionar aos favoritos').first().click();
    await expect(page.getByRole('button', { name: /Favoritos \(1\)/ })).toBeVisible();

    await page.getByRole('button', { name: /Favoritos/ }).click();
    await expect(page.locator('.grid.grid-cols-2').last().locator('button')).toHaveCount(1);
    await evidenciar(page.locator('.w-64').first(), AREA, 'favoritos');
  });

  test('favoritos sobrevivem ao recarregar', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();
    await page.getByTitle('Adicionar aos favoritos').first().click();

    await page.reload();
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();
    await expect(page.getByRole('button', { name: /Favoritos \(1\)/ })).toBeVisible();
  });

  test('usar um objeto o coloca em Recentes', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();
    await page.locator('.grid.grid-cols-2').last().locator('button').first().click();

    await expect(page.getByRole('heading', { name: 'Recentes' })).toBeVisible();
    await evidenciar(page.locator('.w-64').first(), AREA, 'recentes');
  });

  test('filtro por categoria reduz a lista', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Objetos', exact: true }).click();
    const grade = page.locator('.grid.grid-cols-2').last();
    const todos = await grade.locator('button').count();

    await page.getByRole('button', { name: 'Electrical', exact: true }).click();
    await expect.poll(() => grade.locator('button').count()).toBeLessThan(todos);
    await evidenciar(page.locator('.w-64').first(), AREA, 'categoria-electrical');
  });
});
