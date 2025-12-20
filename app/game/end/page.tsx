'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchGameResults, fetchLatestCompletedGame, type GameDoc } from '../../../lib/firestore-helpers';
import { PLAYER_ORDER, PLAYER_PROFILES, type PlayerInitial } from '../../../lib/constants';

type ResultWithProfile = {
  rank: number;
  playerId: PlayerInitial;
  totalPoints: number;
  displayName: string;
};

export default function GameEndPage() {
  const [game, setGame] = useState<GameDoc | null>(null);
  const [results, setResults] = useState<ResultWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleRanks, setVisibleRanks] = useState<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const latestGame = await fetchLatestCompletedGame();
        if (!mounted) return;
        if (!latestGame) {
          setError('No completed games found.');
          return;
        }
        setGame(latestGame);
        const rawResults = await fetchGameResults(latestGame.id);
        if (!mounted) return;
        const ordered = rawResults.sort((a, b) => a.rank - b.rank).map((entry) => ({
          ...entry,
          displayName: PLAYER_PROFILES[entry.playerId].displayName,
        }));
        setResults(ordered as ResultWithProfile[]);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load results.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // visual order stays top-to-bottom (1st to 4th), but reveal runs bottom-to-top
  const displayOrder = useMemo(() => {
    return [...results].sort((a, b) => a.rank - b.rank);
  }, [results]);

  const revealOrder = useMemo(() => {
    return [...results].sort((a, b) => b.rank - a.rank);
  }, [results]);

  useEffect(() => {
    if (!revealOrder.length) return;
    setVisibleRanks(new Set());
    const interval = setInterval(() => {
      setVisibleRanks((prev) => {
        const next = new Set(prev);
        const nextIndex = next.size;
        if (nextIndex >= revealOrder.length) {
          clearInterval(interval);
          return next;
        }
        next.add(revealOrder[nextIndex].rank);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [revealOrder]);

  if (loading) {
    return (
      <main className="end-screen">
        <p>Gathering podium results…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="end-screen">
        <p className="error-text">{error}</p>
        <Link href="/" className="primary-button">
          Back home
        </Link>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="end-screen">
        <p>No game results to display.</p>
        <Link href="/" className="primary-button">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main className="end-screen">
      <header className="end-header">
        <h1>Game Complete!</h1>
        <p>
          {game.endedAt
            ? `Finished on ${new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }).format(game.endedAt)}`
            : 'Great job everyone!'}
        </p>
      </header>

      <section className="podium">
        {displayOrder.map((entry) => {
          if (!visibleRanks.has(entry.rank)) {
            return null;
          }
          const isWinner = entry.rank === 1;
          return (
            <article
              key={entry.playerId}
              className={isWinner ? 'podium-card winner reveal' : 'podium-card reveal'}
            >
              <div
                className="avatar large"
                style={{ backgroundColor: PLAYER_PROFILES[entry.playerId].placeholderColor }}
              >
                {isWinner ? '👑' : entry.playerId}
              </div>
              <div className="podium-content">
                <p className="placement">
                  {ordinal(entry.rank)} place{isWinner ? ' 🎉' : ''}
                </p>
                <h2>{entry.displayName}</h2>
                <p className="points">{entry.totalPoints} points</p>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="end-footer">
        <Link href="/" className="primary-button">
          Start a new game
        </Link>
        <Link href="/history" className="secondary-button">
          View history
        </Link>
      </footer>
    </main>
  );
}

function ordinal(rank: number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return `${rank}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

