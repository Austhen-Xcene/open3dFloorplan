import { test, expect } from '@playwright/test';
import { abrirEditor, inserirAmbiente, evidenciar, ambientesNaBarra, projetoSalvo } from './apoio';

const AREA = '08-persistencia-exportacao';

test.describe('Persistência', () => {
  test('recarregar a página mantém o projeto', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    const url = page.url();

    await page.reload();
    await expect(page).toHaveURL(url);
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);

    await expect.poll(async () => (await projetoSalvo(page))?.floors?.[0]?.rooms?.[0]?.name).toBe('Sala');
    await evidenciar(page, AREA, 'apos-recarregar');
  });

  test('guarda também o pavimento e as unidades', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await expect.poll(async () => (await projetoSalvo(page))?.floors?.[0]?.walls?.length).toBe(4);
    const projeto = await projetoSalvo(page);

    expect(projeto.floors).toHaveLength(1);
    expect(projeto.activeFloorId).toBe(projeto.floors[0].id);
    expect(projeto.floors[0].walls[0]).toHaveProperty('thickness');
  });
});

test.describe('Exportação', () => {
  test.beforeEach(async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
  });

  const formatos: [string, RegExp][] = [
    ['Baixar JSON', /\.json$/],
    ['Exportar em SVG', /\.svg$/],
    ['Exportar em DXF', /\.dxf$/],
    ['Exportar em PDF', /\.pdf$/],
  ];

  for (const [rotulo, extensao] of formatos) {
    test(`${rotulo} baixa um arquivo`, async ({ page }) => {
      await page.getByRole('button', { name: 'Exportar' }).click();
      const download = page.waitForEvent('download', { timeout: 20_000 });
      await page.getByRole('button', { name: rotulo }).click();
      const arquivo = await download;
      expect(arquivo.suggestedFilename()).toMatch(extensao);
    });
  }

  test('Exportar em PNG baixa um arquivo', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();
    const download = page.waitForEvent('download', { timeout: 20_000 });
    await page.getByRole('button', { name: 'Exportar em PNG' }).click();
    const arquivo = await download;
    expect(arquivo.suggestedFilename()).toMatch(/\.png$/);
  });

  test('o JSON exportado tem o ambiente e as paredes', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar JSON' }).click();
    const arquivo = await download;

    const caminho = await arquivo.path();
    const conteudo = JSON.parse(await (await import('node:fs/promises')).readFile(caminho, 'utf8'));
    expect(conteudo.floors[0].rooms[0].name).toBe('Sala');
    expect(conteudo.floors[0].walls).toHaveLength(4);
  });
});

test.describe('Atalhos', () => {
  test('a lista de atalhos abre com ? e fecha com Esc', async ({ page }) => {
    await abrirEditor(page);
    await page.keyboard.press('Shift+Slash');

    await expect(page.getByRole('heading', { name: 'Atalhos de teclado' })).toBeVisible();
    await evidenciar(page, AREA, 'atalhos');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Atalhos de teclado' })).toBeHidden();
  });

  test('a paleta de comandos abre com Ctrl+K', async ({ page }) => {
    await abrirEditor(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder(/Search furniture|Buscar/)).toBeVisible();
    await evidenciar(page, AREA, 'paleta-comandos');
  });
});
