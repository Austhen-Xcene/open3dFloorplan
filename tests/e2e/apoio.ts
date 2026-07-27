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

/** Caixa delimitadora de cada ambiente salvo, a partir das paredes dele. */
export async function limitesDosAmbientes(page: Page) {
  const projeto = await projetoSalvo(page);
  const piso = projeto?.floors?.[0];
  if (!piso) return [];
  return piso.rooms.map((r: any) => {
    const pontos = r.walls
      .map((id: string) => piso.walls.find((w: any) => w.id === id))
      .filter(Boolean)
      .flatMap((w: any) => [w.start, w.end]);
    return {
      nome: r.name,
      minX: Math.min(...pontos.map((p: any) => p.x)), maxX: Math.max(...pontos.map((p: any) => p.x)),
      minY: Math.min(...pontos.map((p: any) => p.y)), maxY: Math.max(...pontos.map((p: any) => p.y)),
    };
  });
}

/** Pares de ambientes cujas áreas se cruzam. Vazio = planta consistente. */
export async function sobreposicoes(page: Page): Promise<string[]> {
  const caixas = await limitesDosAmbientes(page);
  const TOLERANCIA = 1; // cm — encostar não é sobrepor
  const pares: string[] = [];
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i], b = caixas[j];
      const cruza = a.minX < b.maxX - TOLERANCIA && b.minX < a.maxX - TOLERANCIA
                 && a.minY < b.maxY - TOLERANCIA && b.minY < a.maxY - TOLERANCIA;
      if (cruza) pares.push(`${a.nome} × ${b.nome}`);
    }
  }
  return pares;
}

/** Retângulo de 4 paredes, em cm, para montar um projeto de teste. */
function retangulo(id: string, nome: string, x0: number, y0: number, x1: number, y1: number) {
  const p = (x: number, y: number) => ({ x, y });
  const cantos = [p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)];
  const walls = cantos.map((inicio, i) => ({
    id: `${id}-w${i}`,
    start: inicio,
    end: cantos[(i + 1) % 4],
    thickness: 15, height: 280, color: '#444444',
  }));
  const room = {
    id, name: nome, walls: walls.map((w) => w.id),
    floorTexture: 'hardwood',
    area: Math.abs((x1 - x0) * (y1 - y0)) / 10000,
    roomType: 'indoor',
  };
  return { walls, room };
}

/**
 * Carrega o editor com um projeto montado à mão.
 *
 * O posicionamento automático depende de nomes e da ordem de inserção, então reproduzir
 * uma planta específica pelo formulário é frágil. Semear o estado torna o teste exato.
 */
export async function abrirEditorCom(
  page: Page,
  ambientes: { id: string; nome: string; x0: number; y0: number; x1: number; y1: number }[],
) {
  const partes = ambientes.map((a) => retangulo(a.id, a.nome, a.x0, a.y0, a.x1, a.y1));
  const projeto = {
    id: 'teste', name: 'Projeto de teste',
    floors: [{
      id: 'piso', name: 'Térreo', level: 0,
      walls: partes.flatMap((p) => p.walls),
      rooms: partes.map((p) => p.room),
      doors: [], windows: [], furniture: [], stairs: [], columns: [],
      guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [],
    }],
    activeFloorId: 'piso',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  await page.goto('/editor');
  await page.evaluate((p) => {
    localStorage.setItem('floorplan_projects', JSON.stringify({ teste: JSON.stringify(p) }));
  }, projeto);
  await page.goto('/editor?id=teste');

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await esperarPrimeiroQuadro(canvas);
  return { canvas };
}

/**
 * Espera a gravação (debounce de 500 ms) refletir a largura esperada do ambiente.
 *
 * Necessário antes de afirmar ausência de sobreposição: `expect.poll` para no primeiro
 * acerto, e uma leitura do estado ANTERIOR passaria por engano.
 */
export async function esperarLarguraGravada(page: Page, nome: string, larguraCm: number) {
  await expect.poll(async () => {
    const caixas = await limitesDosAmbientes(page);
    const alvo = caixas.find((c: any) => c.nome === nome);
    return alvo ? Math.round(alvo.maxX - alvo.minX) : -1;
  }, { timeout: 10_000 }).toBe(larguraCm);
}

/**
 * Espera a gravação (debounce de 500 ms) parar de mudar.
 *
 * Necessário antes de afirmar ausência de sobreposição: `expect.poll` para no primeiro
 * acerto e uma leitura do estado ANTERIOR passaria por engano.
 */
export async function esperarPlantaEstavel(page: Page) {
  let anterior = '';
  await expect.poll(async () => {
    const atual = JSON.stringify(await limitesDosAmbientes(page));
    const estavel = atual === anterior && atual !== '[]';
    anterior = atual;
    return estavel;
  }, { timeout: 10_000, intervals: [300, 300, 300, 300, 300] }).toBe(true);
}
