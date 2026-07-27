import { test, expect } from '@playwright/test';
import { abrirEditor, inserirAmbiente, evidenciar, contarPixeis, centroDoCanvas } from './apoio';

const AREA = '04-canvas';

test.describe('Canvas: zoom, pan e camadas', () => {
  test('roda do mouse aproxima e afasta', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    const { x, y } = await centroDoCanvas(canvas);
    const rotulo = page.getByTitle('Voltar para 100%').first();

    const percentual = async () => Number((await rotulo.innerText()).replace('%', ''));

    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -300);
    await expect.poll(percentual).toBeGreaterThan(100);

    // Cada evento de roda aplica um passo fixo, então volta descendo passo a passo.
    const aproximado = await percentual();
    await page.mouse.wheel(0, 300);
    await expect.poll(percentual).toBeLessThan(aproximado);

    await evidenciar(page, AREA, 'zoom-por-scroll');
  });

  test('enquadrar o projeto (F) muda o zoom', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 12, 9);
    const rotulo = page.getByTitle('Voltar para 100%').first();

    await canvas.click({ position: { x: 500, y: 400 } });
    await page.keyboard.press('f');
    await expect.poll(async () => (await rotulo.innerText())).not.toBe('100%');
    await evidenciar(page, AREA, 'enquadrado');
  });

  test('alterna grade e o desenho muda', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    const comGrade = await contarPixeis(canvas);

    await page.getByTitle('Alternar grade (G)').click();
    await expect.poll(() => contarPixeis(canvas).then((p) => p.tinta))
      .not.toBe(comGrade.tinta);
    await evidenciar(page, AREA, 'sem-grade');

    await page.getByTitle('Alternar grade (G)').click();
  });

  test('alterna réguas', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    const antes = await contarPixeis(canvas);
    await page.getByTitle('Alternar réguas').click();
    await expect.poll(() => contarPixeis(canvas).then((p) => p.tinta)).not.toBe(antes.tinta);
    await evidenciar(page, AREA, 'sem-reguas');
  });

  test('minimapa aparece quando há paredes', async ({ page }) => {
    await abrirEditor(page);
    await expect(page.locator('canvas')).toHaveCount(1);

    await inserirAmbiente(page, 'Sala', 5, 4);
    await expect(page.locator('canvas')).toHaveCount(2);
    await evidenciar(page, AREA, 'com-minimapa');

    await page.getByTitle('Alternar minimapa').click();
    await expect(page.locator('canvas')).toHaveCount(1);
  });

  test('painel de camadas abre e desliga uma camada', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    await page.getByTitle('Camadas', { exact: true }).click();
    await expect(page.getByText('Paredes', { exact: true })).toBeVisible();
    await evidenciar(page, AREA, 'painel-camadas');

    const antes = await contarPixeis(canvas);
    await page.getByRole('checkbox').first().uncheck();   // Paredes
    await expect.poll(() => contarPixeis(canvas).then((p) => p.tinta)).toBeLessThan(antes.tinta);
    await evidenciar(page, AREA, 'paredes-ocultas');
  });

  test('arrastar com a mão move a vista', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    const antes = await contarPixeis(canvas);

    await page.getByRole('button', { name: 'Mão', exact: true }).click();
    const { x, y } = await centroDoCanvas(canvas);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 220, y - 160, { steps: 12 });
    await page.mouse.up();

    await expect.poll(() => contarPixeis(canvas).then((p) => p.tinta)).not.toBe(antes.tinta);
    await evidenciar(page, AREA, 'apos-pan');
  });
});
