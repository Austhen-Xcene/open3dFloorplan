import { expect, type Page, type Locator } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/** Onde as capturas viram documentação da interface. */
const RAIZ_EVIDENCIAS = 'docs/ui/_evidencias';

/**
 * Guarda uma captura na pasta da área de UI correspondente.
 * O nome do arquivo é o parâmetro sendo documentado.
 */
export async function evidenciar(alvo: Page | Locator, area: string, parametro: string) {
  const pasta = `${RAIZ_EVIDENCIAS}/${area}`;
  mkdirSync(pasta, { recursive: true });
  await alvo.screenshot({ path: `${pasta}/${parametro}.png` });
}

/** Abre o editor com projeto limpo e espera o canvas estar pronto. */
export async function abrirEditor(page: Page) {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });

  await page.goto('/editor');
  await page.evaluate(() => {
    localStorage.removeItem('floorplan_projects');
    localStorage.removeItem('o3d_recent_furniture');
    localStorage.removeItem('o3d_favorite_furniture');
  });
  await page.goto('/editor');

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await esperarPrimeiroQuadro(canvas);
  return { canvas, erros };
}

/**
 * O desenho roda por requestAnimationFrame; esperar tempo fixo dá teste instável.
 * Espera até o canvas ter pixel pintado de verdade.
 */
export async function esperarPrimeiroQuadro(canvas: Locator) {
  await expect
    .poll(async () => contarPixeis(canvas).then((p) => p.pintados), { timeout: 10_000 })
    .toBeGreaterThan(0);
}

/** Quantos pixels o canvas tem pintados, e quantos destoam do fundo. */
export async function contarPixeis(canvas: Locator) {
  return canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d');
    if (!ctx || !el.width) return { pintados: 0, tinta: 0 };
    const d = ctx.getImageData(0, 0, el.width, el.height).data;
    let pintados = 0;
    let tinta = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] === 0) continue;
      pintados++;
      // Fundo do editor é quase branco; o que foge disso é desenho.
      if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) tinta++;
    }
    return { pintados, tinta };
  });
}

/** Insere um ambiente retangular pelo formulário da aba Ambientes. */
export async function inserirAmbiente(page: Page, nome: string, largura: number, comprimento: number) {
  await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
  await page.getByPlaceholder('Ex.: Quarto menino').fill(nome);
  const numeros = page.locator('input[type="number"]');
  await numeros.nth(0).fill(String(largura));
  await numeros.nth(1).fill(String(comprimento));
  await page.getByRole('button', { name: 'Adicionar ambiente' }).click();
  await page.waitForTimeout(300);
}

/** Centro do canvas em coordenadas de página. */
export async function centroDoCanvas(canvas: Locator) {
  const caixa = await canvas.boundingBox();
  if (!caixa) throw new Error('canvas sem boundingBox');
  return { x: caixa.x + caixa.width / 2, y: caixa.y + caixa.height / 2, caixa };
}

/** Quantos ambientes o editor está reportando na barra de status. */
export async function ambientesNaBarra(page: Page): Promise<number> {
  const texto = await page.locator('.absolute.bottom-2.right-2').innerText();
  const m = texto.match(/(\d+)\s+ambientes?/);
  return m ? Number(m[1]) : 0;
}

/** Projeto salvo no localStorage, já desserializado. */
export async function projetoSalvo(page: Page) {
  return page.evaluate(() => {
    const bruto = JSON.parse(localStorage.getItem('floorplan_projects') || '{}');
    const primeiro = Object.values(bruto)[0];
    return primeiro ? JSON.parse(primeiro as string) : null;
  });
}
