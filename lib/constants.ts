export const PLAYER_ORDER = ['A', 'Y', 'D', 'C'] as const;

export type PlayerInitial = (typeof PLAYER_ORDER)[number];

export const PLAYER_PROFILES: Record<
  PlayerInitial,
  { displayName: string; fullName: string; placeholderColor: string; avatarUrl: string; slug: string }
> = {
  A: {
    displayName: 'Albert',
    fullName: 'Albert',
    placeholderColor: '#ffb4a2',
    slug: 'albert',
    // Default/fallback avatar (used when random loading fails).
    avatarUrl: '/avatars/albert/bigtwo_albert.jpg',
  },
  Y: {
    displayName: 'Yiming',
    fullName: 'Yiming',
    placeholderColor: '#b4d7ff',
    slug: 'yiming',
    // Default/fallback avatar (used when random loading fails).
    avatarUrl: '/avatars/yiming/bigtwo_yiming.jpg',
  },
  D: {
    displayName: 'Darwin',
    fullName: 'Darwin',
    placeholderColor: '#ffe28a',
    slug: 'darwin',
    // Default/fallback avatar (used when random loading fails).
    avatarUrl: '/avatars/darwin/IMG_3956.JPG',
  },
  C: {
    displayName: 'Curtis',
    fullName: 'Curtis',
    placeholderColor: '#b8f2a4',
    slug: 'curtis',
    // Default/fallback avatar (used when random loading fails).
    avatarUrl: '/avatars/curtis/IMG_1776.jpg',
  },
};

export const PLAYER_SLUG_BY_INITIAL: Record<PlayerInitial, string> = {
  A: PLAYER_PROFILES.A.slug,
  Y: PLAYER_PROFILES.Y.slug,
  D: PLAYER_PROFILES.D.slug,
  C: PLAYER_PROFILES.C.slug,
};

export const DEFAULT_TOTAL_ROUNDS = 10;

