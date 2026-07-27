/**
 * Comparação de nomes de ambiente.
 *
 * Serve para reposicionar um ambiente perto de outro com nome parecido
 * ("Quarto 1" perto de "Quarto 2"). Funções puras, sem store.
 */

import type { Point } from '$lib/models/types';

export const ENVIRONMENT_MATCH_THRESHOLD = 0.7;

export interface EnvironmentMatchLog {
  ambiente: string;
  peso: number;
  passouDoLimite: boolean;
}

export function logEnvironmentPlacement(
  environmentName: string,
  comparisons: EnvironmentMatchLog[],
  decision: string,
  origin: Point,
  attempts = 0,
) {
  console.groupCollapsed(`[Room Match] "${environmentName}" → ${decision}`);
  if (comparisons.length > 0) {
    console.table(comparisons);
  } else {
    console.info('Nenhum ambiente disponível para comparação.');
  }
  console.info('Limite para posicionar à direita:', ENVIRONMENT_MATCH_THRESHOLD);
  console.info('Decisão:', decision);
  console.info('Posição final:', { x: origin.x, y: origin.y });
  console.info('Posições ocupadas ignoradas:', attempts);
  console.groupEnd();
}

export function normalizeEnvironmentName(name: string): string[] {
  const ignoredWords = new Set(['a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'o', 'os']);
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !ignoredWords.has(word));
}

/** Damerau-Levenshtein distance also treats adjacent transposed letters as one typo. */
export function wordEditDistance(a: string, b: string): number {
  const distances = Array.from(
    { length: a.length + 1 },
    () => Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) distances[i][0] = i;
  for (let j = 0; j <= b.length; j++) distances[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + substitutionCost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        distances[i][j] = Math.min(
          distances[i][j],
          distances[i - 2][j - 2] + substitutionCost,
        );
      }
    }
  }
  return distances[a.length][b.length];
}

export function wordSimilarity(a: string, b: string): number {
  const longestLength = Math.max(a.length, b.length);
  if (longestLength === 0) return 1;
  return Math.max(0, 1 - wordEditDistance(a, b) / longestLength);
}

/**
 * Returns a fuzzy score from 0 to 1 using the strongest meaningful word pair.
 * This lets "qaurto menino" match "quarto casal" despite the transposed letters.
 */
export function environmentNameMatchScore(candidateName: string, existingName: string): number {
  const candidateWords = normalizeEnvironmentName(candidateName);
  const existingWords = normalizeEnvironmentName(existingName);
  if (candidateWords.length === 0 || existingWords.length === 0) return 0;

  let score = 0;
  for (const candidate of candidateWords) {
    for (const existing of existingWords) {
      score = Math.max(score, wordSimilarity(candidate, existing));
    }
  }
  return Math.round(score * 1000) / 1000;
}

