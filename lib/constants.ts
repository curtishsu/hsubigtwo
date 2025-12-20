export const PLAYER_ORDER = ['A', 'Y', 'D', 'C'] as const;

export type PlayerInitial = (typeof PLAYER_ORDER)[number];

export const PLAYER_PROFILES: Record<
  PlayerInitial,
  { displayName: string; placeholderColor: string }
> = {
  A: { displayName: 'A', placeholderColor: '#ffb4a2' },
  Y: { displayName: 'Y', placeholderColor: '#b4d7ff' },
  D: { displayName: 'D', placeholderColor: '#ffe28a' },
  C: { displayName: 'C', placeholderColor: '#b8f2a4' },
};

export const DEFAULT_TOTAL_ROUNDS = 10;

