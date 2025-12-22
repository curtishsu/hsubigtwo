export const PLAYER_ORDER = ['A', 'Y', 'D', 'C'] as const;

export type PlayerInitial = (typeof PLAYER_ORDER)[number];

export const PLAYER_PROFILES: Record<
  PlayerInitial,
  { displayName: string; fullName: string; placeholderColor: string; avatarUrl: string }
> = {
  A: {
    displayName: 'Albert',
    fullName: 'Albert',
    placeholderColor: '#ffb4a2',
    avatarUrl: '/avatars/bigtwo_albert.jpg',
  },
  Y: {
    displayName: 'Yiming',
    fullName: 'Yiming',
    placeholderColor: '#b4d7ff',
    avatarUrl: '/avatars/bigtwo_yiming.jpg',
  },
  D: {
    displayName: 'Darwin',
    fullName: 'Darwin',
    placeholderColor: '#ffe28a',
    avatarUrl: '/avatars/bigtwo_darwin.jpg',
  },
  C: {
    displayName: 'Curtis',
    fullName: 'Curtis',
    placeholderColor: '#b8f2a4',
    avatarUrl: '/avatars/bigtwo_curtis.jpg',
  },
};

export const DEFAULT_TOTAL_ROUNDS = 10;

