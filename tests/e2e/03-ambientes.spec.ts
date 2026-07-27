import { test, expect } from '@playwright/test';
import { abrirEditor, inserirAmbiente, evidenciar, contarPixeis, ambientesNaBarra, projetoSalvo } from './apoio';

const AREA = '03-ambientes';

test.describe('Inserção de ambientes', () => {
  test('insere um ambiente e ele aparece na planta e na barra de status', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    const antes = await contarPixeis(canvas);

    await inserirAmbiente(page, 'Sala', 5, 4);

    await expect(page.getByText('Sala inserido: 5.00 × 4.00 m')).toBeVisible();
    await expect.poll(() => contarPixeis(canvas).then((p) => p.tinta))
      .toBeGreaterThan(antes.tinta);
    await expect.poll(() => ambientesNaBarra(page)).toBe(1);
    await expect(page.locator('.absolute.bottom-2.right-2')).toContainText('4 paredes');

    await evidenciar(page, AREA, 'um-ambiente');
  });

  test('grava as 4 paredes e o ambiente no projeto', async ({ page }) => {
    await abrirEditor(page);
    await inserirAmbiente(page, 'Cozinha', 3, 2.5);

    await expect.poll(async () => {
      const p = await projetoSalvo(page);
      return p?.floors?.[0]?.walls?.length;
    }).toBe(4);

    const projeto = await projetoSalvo(page);
    const ambiente = projeto.floors[0].rooms[0];
    expect(ambiente.name).toBe('Cozinha');
    // 3 m × 2,5 m = 7,5 m²
    expect(ambiente.area).toBeCloseTo(7.5, 1);
  });

  test('posiciona vários ambientes sem sobrepor', async ({ page }) => {
    const { canvas } = await abrirEditor(page);
    await inserirAmbiente(page, 'Sala', 5, 4);
    await inserirAmbiente(page, 'Cozinha', 3, 3);
    await inserirAmbiente(page, 'Quarto 1', 4, 3);

    await expect.poll(() => ambientesNaBarra(page)).toBe(3);

    const projeto = await projetoSalvo(page);
    const limites = projeto.floors[0].rooms.map((r: any) => {
      const paredes = r.walls.map((id: string) => projeto.floors[0].walls.find((w: any) => w.id === id));
      const pts = paredes.flatMap((w: any) => [w.start, w.end]);
      return {
        minX: Math.min(...pts.map((p: any) => p.x)), maxX: Math.max(...pts.map((p: any) => p.x)),
        minY: Math.min(...pts.map((p: any) => p.y)), maxY: Math.max(...pts.map((p: any) => p.y)),
      };
    });
    for (let i = 0; i < limites.length; i++) {
      for (let j = i + 1; j < limites.length; j++) {
        const a = limites[i], b = limites[j];
        const sobrepoe = a.minX < b.maxX - 1 && b.minX < a.maxX - 1
                      && a.minY < b.maxY - 1 && b.minY < a.maxY - 1;
        expect(sobrepoe, `ambientes ${i} e ${j} se sobrepõem`).toBe(false);
      }
    }

    await evidenciar(page, AREA, 'tres-ambientes');
  });

  test('recusa nome vazio', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar ambiente' }).click();
    await expect(page.getByRole('alert')).toHaveText('Informe o nome do ambiente.');
    await evidenciar(page, AREA, 'erro-nome-vazio');
  });

  test('recusa medida fora do intervalo', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
    await page.getByPlaceholder('Ex.: Quarto menino').fill('Gigante');
    await page.locator('input[type="number"]').nth(0).fill('80');
    await page.getByRole('button', { name: 'Adicionar ambiente' }).click();
    await expect(page.getByRole('alert')).toContainText('entre 0,50 m e 50 m');
    await evidenciar(page, AREA, 'erro-medida-invalida');
  });

  test('calcula a área do formulário antes de inserir', async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole('button', { name: 'Ambientes', exact: true }).click();
    await page.locator('input[type="number"]').nth(0).fill('6');
    await page.locator('input[type="number"]').nth(1).fill('2.5');
    await expect(page.getByText('15.00 m²')).toBeVisible();
  });
});
