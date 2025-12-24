import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { PLAYER_SLUG_BY_INITIAL, type PlayerInitial } from '../../../../lib/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

async function listImages(absoluteDir: string): Promise<string[]> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()));
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx] ?? null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerIdRaw = searchParams.get('playerId');
  const rankRaw = searchParams.get('rank');

  const playerId = (playerIdRaw ?? '').toUpperCase() as PlayerInitial;
  const slug = (PLAYER_SLUG_BY_INITIAL as Record<string, string | undefined>)[playerId];
  if (!slug) {
    return NextResponse.json({ error: 'Invalid playerId' }, { status: 400 });
  }

  const rank = Number(rankRaw);
  const wantsWinnerDir = Number.isFinite(rank) && rank === 1;

  const baseDir = path.join(process.cwd(), 'public', 'avatars', slug);
  const winnerDir = path.join(baseDir, '1st');

  let chosenUrl: string | null = null;

  if (wantsWinnerDir) {
    const winnerImages = await listImages(winnerDir);
    const winnerPick = pickRandom(winnerImages);
    if (winnerPick) {
      chosenUrl = `/avatars/${slug}/1st/${winnerPick}`;
    }
  }

  if (!chosenUrl) {
    const baseImages = await listImages(baseDir);
    const basePick = pickRandom(baseImages);
    if (basePick) {
      chosenUrl = `/avatars/${slug}/${basePick}`;
    }
  }

  if (!chosenUrl) {
    return NextResponse.json({ error: 'No images found' }, { status: 404 });
  }

  return NextResponse.json(
    { url: chosenUrl },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}


