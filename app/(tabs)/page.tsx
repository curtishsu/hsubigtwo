'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensurePlayersSeeded, startNewGame } from '../../lib/firestore-helpers';
import { DEFAULT_TOTAL_ROUNDS } from '../../lib/constants';
import { useActiveGameId, useLiveGame } from '../../hooks/useActiveGame';

export default function HomePage() {
  const router = useRouter();
  const { gameId, loading, setGameId } = useActiveGameId();
  const game = useLiveGame(gameId);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [rounds, setRounds] = useState(DEFAULT_TOTAL_ROUNDS);

  useEffect(() => {
    ensurePlayersSeeded().catch((err) => {
      console.error('Error seeding players', err);
    });
  }, []);

  useEffect(() => {
    if (!loading && game?.status === 'active') {
      router.push('/game');
    }
  }, [game, loading, router]);

  const heroTitle = useMemo(() => {
    if (loading) return 'Checking for active games…';
    if (game) return 'Resuming your active session';
    return 'Keep score the easy way';
  }, [game, loading]);

  const heroDescription = useMemo(() => {
    if (loading) return 'Looking for any open games before we create a new one.';
    if (game) {
      const nextRound = Math.max(1, game.roundsPlayed + 1);
      const clamped = Math.min(nextRound, game.totalRounds);
      return `Round ${clamped} of ${game.totalRounds} is ready to continue.`;
    }
    return 'Choose how many rounds to play, then tap start.';
  }, [game, loading]);

  const handleStart = async () => {
    setError(null);
    if (rounds <= 0) {
      setError('Number of rounds must be at least 1.');
      return;
    }
    try {
      setIsStarting(true);
      const newGameId = await startNewGame(rounds);
      setGameId(newGameId);
      router.push('/game');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start game.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="home-layout">
      <header className="home-header">
        <h1>Big Two</h1>
      </header>

      <section className="card hero-card">
        <div>
          <h2>{heroTitle}</h2>
          <p>{heroDescription}</p>
        </div>
        <div className="start-controls">
          <label htmlFor="rounds-input">Number of rounds</label>
          <input
            id="rounds-input"
            type="number"
            min={1}
            max={30}
            value={rounds}
            onChange={(event) => setRounds(Number(event.target.value))}
          />
        </div>
        <button
          className="primary-button"
          onClick={handleStart}
          disabled={isStarting || loading || !!game}
        >
          {isStarting ? 'Starting…' : 'Start Game'}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </div>
  );
}

