import { test, expect } from '@playwright/test';
import { abrirEditor, abrirEditorCom, inserirAmbiente, evidenciar, sobreposicoes, centroDoCanvas, esperarLarguraGravada } from './apoio';

const AREA = '09-rotacao';

test.describe('Rotação de ambiente', () => {
  /**
   * O caso que quebrava: girar cresce a área para os lados, e o vizinho atingido não
   * compartilha parede — o reflow de vizinhos conectados não o alcança. Sem uma
   * resolução final de sobreposição, o ambiente ficava por cima do outro até o usuário
   * clicar nele de novo (o mouseup é que chamava `resolveRoomOverlap`).
   */
  test('girar contra vizinho NÃO adjacente também se reacomoda', async ({ page }) => {
    const { canvas } = await abrirEditorCom(page, [
      { id: 'a', nome: 'quarto',   x0: 0,   y0: 200, x1: 400, y1: 500 },
      { id: 'b', nome: 'corredor', x0: 600, y0: 0,   x1: 700, y1: 600 },
    ]);

    await canvas.click({ position: { x: 40, y: 40 } });
    await page.keyboard.press('f');

    const zoom = await page.evaluate(() =>
      Number((document.querySelector('[title="Voltar para 100%"]') as HTMLElement).innerText.replace('%', '')) / 100);
    const { caixa } = await centroDoCanvas(canvas);
    const paraTela = (wx: number, wy: number) => ({
      x: caixa.x + caixa.width / 2 + (wx - 350) * zoom,
      y: caixa.y + caixa.height / 2 + (wy - 300) * zoom,
    });

    const centroDoCorredor = paraTela(650, 300);
    await page.mouse.click(centroDoCorredor.x, centroDoCorredor.y);
    await expect(page.locator('.fixed.right-0.top-12 input[type="text"]')).toHaveValue('corredor');

    await page.getByRole('button', { name: 'Girar ambiente 90 graus' }).click();

    // O corredor de 1×6 vira 6×1: espera a gravação refletir isso antes de julgar.
    await esperarLarguraGravada(page, 'corredor', 600);
    expect(await sobreposicoes(page)).toEqual([]);
    await evidenciar(page, AREA, 'vizinho-nao-adjacente');
  });

  /**
   * Girar troca largura por comprimento, então a área ocupada muda de forma. Se a nova
   * forma invade um vizinho, o ambiente precisa se reacomodar na hora — e não só depois
   * que o usuário clica nele de novo.
   */
  test('girar não deixa o ambiente sobrepondo outro', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await inserirAmbiente(page, 'Quarto', 4, 3);
    await inserirAmbiente(page, 'Corredor', 1, 6);

    await expect.poll(() => sobreposicoes(page)).toEqual([]);

    await page.getByRole('button', { name: 'Girar ambiente 90 graus' }).click();

    await expect.poll(() => sobreposicoes(page)).toEqual([]);
    await evidenciar(page, AREA, 'apos-girar');
  });

  test('girar duas vezes seguidas também não sobrepõe', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await inserirAmbiente(page, 'Quarto', 4, 3);
    await inserirAmbiente(page, 'Corredor', 1, 6);

    const girar = page.getByRole('button', { name: 'Girar ambiente 90 graus' });
    await girar.click();
    await expect.poll(() => sobreposicoes(page)).toEqual([]);
    await girar.click();
    await expect.poll(() => sobreposicoes(page)).toEqual([]);
  });

  test('girar de volta devolve as medidas originais', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Corredor', 1, 6);

    const painel = page.locator('.fixed.right-0.top-12');
    const largura = () => painel.locator('input[type="number"]').first().inputValue();
    expect(await largura()).toBe('1');

    const girar = page.getByRole('button', { name: 'Girar ambiente 90 graus' });
    await girar.click();
    await expect.poll(largura).toBe('6');
    await girar.click();
    await expect.poll(largura).toBe('1');
  });
});
