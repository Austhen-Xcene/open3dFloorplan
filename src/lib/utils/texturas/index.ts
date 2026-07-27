/**
 * Ponto de entrada das texturas de parede e piso.
 *
 * Estratégia: tenta a foto (assíncrona, cacheada); enquanto ela não chega, devolve o
 * gerador procedural equivalente. `setTextureLoadCallback` avisa o canvas para redesenhar
 * quando a foto termina de carregar.
 */
import { loadPhotoTexture, notifyTextureLoad } from './base';
import { generateBrickTexture, generateStoneTexture, generateConcreteTexture } from './alvenaria';
import { generateWoodPanelTexture, generateSubwayTileTexture } from './acabamentos';

export { setTextureLoadCallback } from './base';
export { getFloorTextureCanvas, generateHardwoodTexture } from './pisos';
export { generateBrickTexture, generateStoneTexture, generateConcreteTexture } from './alvenaria';
export { generateWoodPanelTexture, generateSubwayTileTexture } from './acabamentos';

export function getWallTextureCanvas(textureId: string, color: string): HTMLCanvasElement | null {
  const photo = loadPhotoTexture(textureId, notifyTextureLoad);
  if (photo) return photo;

  switch (textureId) {
    case 'red-brick': return generateBrickTexture(color, 'standard');
    case 'exposed-brick': return generateBrickTexture(color, 'exposed');
    case 'stone': return generateStoneTexture(color);
    case 'wood-panel': return generateWoodPanelTexture(color);
    case 'concrete-block': return generateConcreteTexture(color);
    case 'subway-tile': return generateSubwayTileTexture(color);
    default: return null;
  }
}
