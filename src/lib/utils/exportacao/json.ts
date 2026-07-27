/** Exportação do projeto em JSON — mesmo formato aceito pela importação. */
import type { Project } from '$lib/models/types';
import { download } from './comum';

export function exportAsJSON(project: Project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  download(blob, `${project.name || 'project'}.json`);
}

