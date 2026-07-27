import { test, expect } from '@playwright/test';
import { abrirEditor, evidenciar, projetoSalvo } from './apoio';

const AREA = '02-barra-superior';

test.describe('Barra superior', () => {
  test.beforeEach(async ({ page }) => { await abrirEditor(page); });

  test('renomeia o projeto', async ({ page }) => {
    await page.getByTitle('Clique para renomear').click();
    const campo = page.locator('input[type="text"]').first();
    await campo.fill('Casa do Vitor');
    await campo.blur();

    await expect(page.getByRole('button', { name: 'Casa do Vitor' })).toBeVisible();
    await expect.poll(async () => (await projetoSalvo(page))?.name).toBe('Casa do Vitor');
    await evidenciar(page, AREA, 'projeto-renomeado');
  });

  test('adiciona e remove pavimento', async ({ page }) => {
    await expect(page.getByText('1 Pavimento')).toBeVisible();

    await page.getByRole('button', { name: 'Adicionar pavimento' }).click();
    await expect(page.getByText('2 Pavimentos')).toBeVisible();
    await evidenciar(page, AREA, 'dois-pavimentos');

    await page.getByRole('button', { name: /^Excluir / }).last().click();
    await expect(page.getByText('1 Pavimento')).toBeVisible();
  });

  test('não deixa excluir o último pavimento', async ({ page }) => {
    // Com um só pavimento o botão de excluir nem é renderizado.
    await expect(page.getByRole('button', { name: /^Excluir / })).toHaveCount(0);
  });

  test('zoom: aproximar, afastar e voltar para 100%', async ({ page }) => {
    const rotulo = page.getByTitle('Voltar para 100%').first();
    await expect(rotulo).toHaveText('100%');

    await page.getByRole('button', { name: 'Aproximar' }).first().click();
    await expect(rotulo).toHaveText('125%');

    await page.getByRole('button', { name: 'Afastar' }).first().click();
    await expect(rotulo).toHaveText('100%');

    await page.getByRole('button', { name: 'Aproximar' }).first().click();
    await rotulo.click();
    await expect(rotulo).toHaveText('100%');
  });

  test('alterna entre selecionar e mão', async ({ page }) => {
    const mao = page.getByRole('button', { name: 'Mão', exact: true });
    await mao.click();
    await expect(mao).toHaveClass(/bg-white/);
    await evidenciar(page, AREA, 'modo-mao');

    const selecionar = page.getByRole('button', { name: 'Selecionar', exact: true });
    await selecionar.click();
    await expect(selecionar).toHaveClass(/bg-white/);
  });

  test('abre o resumo de áreas', async ({ page }) => {
    await page.getByRole('button', { name: 'Resumo de áreas' }).click();
    await expect(page.getByRole('heading', { name: /Resumo de áreas/ })).toBeVisible();
    await evidenciar(page, AREA, 'resumo-de-areas');
    await page.keyboard.press('Escape');
  });

  test('menu Exportar lista todos os formatos', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();
    for (const item of ['Layout de impressão', 'Exportar em PNG', 'Exportar em SVG',
                        'Exportar em DXF', 'Exportar em DWG', 'Exportar em PDF',
                        'Baixar JSON', 'Novo projeto']) {
      await expect(page.getByRole('button', { name: item })).toBeVisible();
    }
    await evidenciar(page, AREA, 'menu-exportar');
  });

  test('fecha o menu Exportar ao clicar fora', async ({ page }) => {
    await page.getByRole('button', { name: 'Exportar' }).click();
    await expect(page.getByRole('button', { name: 'Baixar JSON' })).toBeVisible();

    await page.locator('canvas').first().click({ position: { x: 40, y: 40 } });
    await expect(page.getByRole('button', { name: 'Baixar JSON' })).toBeHidden();
  });

  test('indica que salvou', async ({ page }) => {
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Salvo/)).toBeVisible();
  });
});
