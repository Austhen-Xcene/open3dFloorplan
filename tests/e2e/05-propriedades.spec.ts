import { test, expect } from '@playwright/test';
import { abrirEditor, inserirAmbiente, evidenciar, projetoSalvo, centroDoCanvas } from './apoio';

const AREA = '05-propriedades';

test.describe('Painel de propriedades', () => {
  test('fica escondido sem seleção', async ({ page }) => {
    await abrirEditor(page);
    await expect(page.locator('.fixed.right-0.top-12')).toHaveClass(/hidden/);
  });

  test('mostra o ambiente selecionado com nome, medidas e área', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    const painel = page.locator('.fixed.right-0.top-12');
    await expect(painel).not.toHaveClass(/hidden/);
    await expect(painel.getByRole('heading')).toContainText('Ambiente');
    await expect(painel.locator('input[type="text"]')).toHaveValue('Sala');
    await expect(painel.getByText('20.0 m²')).toBeVisible();

    await evidenciar(painel, AREA, 'ambiente-selecionado');
  });

  test('renomeia o ambiente e grava no projeto', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    const painel = page.locator('.fixed.right-0.top-12');
    await painel.locator('input[type="text"]').fill('Sala de estar');

    await expect.poll(async () => (await projetoSalvo(page))?.floors?.[0]?.rooms?.[0]?.name)
      .toBe('Sala de estar');
    await evidenciar(painel, AREA, 'ambiente-renomeado');
  });

  test('redimensiona o ambiente pelas medidas', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    const painel = page.locator('.fixed.right-0.top-12');
    await painel.locator('input[type="number"]').first().fill('7');
    await painel.locator('input[type="number"]').first().blur();

    await expect(painel.getByText('28.0 m²')).toBeVisible();
    await evidenciar(painel, AREA, 'ambiente-redimensionado');
  });

  test('recusa medida fora do intervalo e explica', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    const painel = page.locator('.fixed.right-0.top-12');
    await painel.locator('input[type="number"]').first().fill('90');
    await painel.locator('input[type="number"]').first().blur();

    await expect(painel.getByRole('alert')).toContainText('entre 0,50 m e 50 m');
    await evidenciar(painel, AREA, 'medida-recusada');
  });

  test('botão de girar aparece assim que o ambiente é inserido', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);

    // A caixa vem do polígono do ambiente, não da seleção múltipla — inserir pelo
    // formulário já basta.
    await expect(page.getByRole('button', { name: 'Girar ambiente 90 graus' })).toBeVisible();
    await evidenciar(page, AREA, 'botao-girar');

    // E continua valendo depois de clicar nele na planta.
    const { x, y } = await centroDoCanvas(canvas);
    await page.mouse.click(x, y);
    await expect(page.getByRole('button', { name: 'Girar ambiente 90 graus' })).toBeVisible();
  });

  test('girar 90° troca largura por comprimento', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 6, 3);

    const painel = page.locator('.fixed.right-0.top-12');
    const larguraAntes = await painel.locator('input[type="number"]').first().inputValue();

    await page.getByRole('button', { name: 'Girar ambiente 90 graus' }).click();
    await expect.poll(async () =>
      painel.locator('input[type="number"]').first().inputValue(),
    ).not.toBe(larguraAntes);

    await evidenciar(page, AREA, 'ambiente-girado');
  });
});
