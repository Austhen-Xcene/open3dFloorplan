import { test, expect } from '@playwright/test';
import { abrirEditor, abrirEditorCom, inserirAmbiente, evidenciar, sobreposicoes, limitesDosAmbientes, centroDoCanvas, esperarLarguraGravada, esperarPlantaEstavel } from './apoio';

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

  /**
   * O relato original veio de "fiquei movendo e rotacionando". Girar reacomoda os
   * vizinhos conectados, e um vizinho empurrado pode cair sobre um terceiro — par que
   * não inclui o ambiente girado. Por isso a resolução tem de olhar a planta inteira.
   */
  test('sequência de rotações mantém a planta inteira consistente', async ({ page }) => {
    const { canvas } = await abrirEditorCom(page, [
      { id: 'a', nome: 'quarto casal',    x0: 0,   y0: 0,   x1: 400, y1: 300 },
      { id: 'b', nome: 'sala',            x0: 0,   y0: 300, x1: 560, y1: 620 },
      { id: 'c', nome: 'quarto solteiro', x0: 400, y0: 0,   x1: 800, y1: 300 },
      { id: 'd', nome: 'cozinha',         x0: 0,   y0: 620, x1: 400, y1: 920 },
      { id: 'e', nome: 'corredor',        x0: 800, y0: 0,   x1: 900, y1: 600 },
    ]);
    await canvas.click({ position: { x: 25, y: 25 } });
    await page.keyboard.press('f');

    const zoom = await page.evaluate(() =>
      Number((document.querySelector('[title="Voltar para 100%"]') as HTMLElement).innerText.replace('%', '')) / 100);
    const { caixa } = await centroDoCanvas(canvas);
    const paraTela = (wx: number, wy: number) => ({
      x: caixa.x + caixa.width / 2 + (wx - 450) * zoom,
      y: caixa.y + caixa.height / 2 + (wy - 460) * zoom,
    });

    const girar = page.getByRole('button', { name: 'Girar ambiente 90 graus' });
    for (let passo = 1; passo <= 8; passo++) {
      const caixas = await limitesDosAmbientes(page);
      const alvo = caixas[passo % caixas.length];
      const centro = paraTela((alvo.minX + alvo.maxX) / 2, (alvo.minY + alvo.maxY) / 2);
      await page.mouse.click(centro.x, centro.y);
      if (await girar.count()) await girar.click();
      await esperarPlantaEstavel(page);
      expect(await sobreposicoes(page), `passo ${passo} girando ${alvo.nome}`).toEqual([]);
    }
    await evidenciar(page, AREA, 'apos-sequencia');
  });

  test('o botão de girar continua clicável com o ambiente colado no topo', async ({ page }) => {
    const { canvas } = await abrirEditorCom(page, [
      { id: 'a', nome: 'quarto', x0: 0, y0: 0, x1: 400, y1: 300 },
    ]);
    await canvas.click({ position: { x: 25, y: 25 } });
    await page.keyboard.press('f');

    const { x, y } = await centroDoCanvas(canvas);
    await page.mouse.click(x, y);
    // Sem espaço acima, o botão vai para baixo do ambiente em vez de sumir atrás da barra.
    await page.getByRole('button', { name: 'Girar ambiente 90 graus' }).click({ timeout: 5000 });
  });
});
