export type SkinId = 'classic' | 'sunset' | 'neon' | 'midnight' | 'candy';

export type SkinDefinition = {
  id: SkinId;
  name: string;
  cost: number;
  ballColor: string;
  trailColor: string;
  glowColor: string;
  accentColor: string;
  description: string;
};

export const SKINS: SkinDefinition[] = [
  {
    id: 'classic',
    name: 'Classic Glow',
    cost: 0,
    ballColor: '#F8F9FA',
    trailColor: 'rgba(255,255,255,0.6)',
    glowColor: 'rgba(255,255,255,0.35)',
    accentColor: '#FFFFFF',
    description: 'A timeless glow that feels right at home in any arena.',
  },
  {
    id: 'sunset',
    name: 'Sunset Ember',
    cost: 350,
    ballColor: '#FF7A5C',
    trailColor: 'rgba(255,196,99,0.6)',
    glowColor: 'rgba(255,122,92,0.35)',
    accentColor: '#FFC463',
    description: 'Warm oranges and golds inspired by dusk over neon cityscapes.',
  },
  {
    id: 'neon',
    name: 'Neon Pulse',
    cost: 500,
    ballColor: '#5CF4FF',
    trailColor: 'rgba(92,244,255,0.6)',
    glowColor: 'rgba(92,244,255,0.35)',
    accentColor: '#12B5EA',
    description: 'High-voltage cyan that leaves a pulsing light trail behind.',
  },
  {
    id: 'midnight',
    name: 'Midnight Nova',
    cost: 700,
    ballColor: '#7B5CFF',
    trailColor: 'rgba(195,152,255,0.6)',
    glowColor: 'rgba(123,92,255,0.4)',
    accentColor: '#C398FF',
    description: 'A cosmic mix of ultraviolet hues for late-night runs.',
  },
  {
    id: 'candy',
    name: 'Candy Burst',
    cost: 450,
    ballColor: '#FF64C8',
    trailColor: 'rgba(255,137,235,0.55)',
    glowColor: 'rgba(255,100,200,0.35)',
    accentColor: '#FF89EB',
    description: 'Playful pinks and violets that pop against any background.',
  },
];

export const DEFAULT_SKIN_ID: SkinId = 'classic';

export const getSkinDefinition = (skinId: SkinId): SkinDefinition => {
  const skin = SKINS.find((entry) => entry.id === skinId);
  return skin ?? SKINS[0];
};
