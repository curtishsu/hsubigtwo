export const PLAYER_ORDER = ['A', 'Y', 'D', 'C'] as const;

export type PlayerInitial = (typeof PLAYER_ORDER)[number];

export const PLAYER_PROFILES: Record<
  PlayerInitial,
  { displayName: string; fullName: string; placeholderColor: string }
> = {
  A: { displayName: 'Albert', fullName: 'Albert', placeholderColor: '#ffb4a2' },
  Y: { displayName: 'Yiming', fullName: 'Yiming', placeholderColor: '#b4d7ff' },
  D: { displayName: 'Darwin', fullName: 'Darwin', placeholderColor: '#ffe28a' },
  C: { displayName: 'Curtis', fullName: 'Curtis', placeholderColor: '#b8f2a4' },
};

export const DEFAULT_TOTAL_ROUNDS = 10;

