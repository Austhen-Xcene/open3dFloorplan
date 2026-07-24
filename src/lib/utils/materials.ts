export interface FloorMaterial {
  id: string;
  color: string;
  pattern?: 'hardwood' | 'tile' | 'carpet' | 'concrete' | 'marble' | 'bamboo' | 'laminate' | 'slate' | 'vinyl';
}

const floorMaterials: FloorMaterial[] = [
  { id: 'none', color: '#e8e4dc' },
  { id: 'light-oak', color: '#ddc9a8', pattern: 'hardwood' },
  { id: 'walnut', color: '#8b6f47', pattern: 'hardwood' },
  { id: 'bamboo', color: '#e6d3a7', pattern: 'bamboo' },
  { id: 'laminate', color: '#b8a082', pattern: 'laminate' },
  { id: 'ceramic-white', color: '#f8f8f8', pattern: 'tile' },
  { id: 'ceramic-gray', color: '#d4cfc9', pattern: 'tile' },
  { id: 'porcelain', color: '#f5f5f5', pattern: 'tile' },
  { id: 'marble-white', color: '#f8f6f0', pattern: 'marble' },
  { id: 'marble-dark', color: '#4a4a4a', pattern: 'marble' },
  { id: 'carpet-beige', color: '#d2b48c', pattern: 'carpet' },
  { id: 'carpet-gray', color: '#a8a29e', pattern: 'carpet' },
  { id: 'concrete', color: '#9ca3af', pattern: 'concrete' },
  { id: 'slate', color: '#708090', pattern: 'slate' },
  { id: 'vinyl', color: '#c4a882', pattern: 'vinyl' },
];

export function getMaterial(id: string): FloorMaterial {
  const legacyMap: Record<string, string> = {
    hardwood: 'light-oak',
    tile: 'ceramic-white',
    carpet: 'carpet-beige',
    marble: 'marble-white',
    'light-wood': 'light-oak',
    'dark-wood': 'walnut',
  };
  const materialId = legacyMap[id] || id;
  return floorMaterials.find((material) => material.id === materialId)
    ?? floorMaterials[1];
}
