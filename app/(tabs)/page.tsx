'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ensurePlayersSeeded,
  fetchCompletedGames,
  startNewGame,
  type GameWithResults,
} from '../../lib/firestore-helpers';
import { DEFAULT_TOTAL_ROUNDS, PLAYER_PROFILES } from '../../lib/constants';
import { useActiveGameId, useLiveGame } from '../../hooks/useActiveGame';

const formatPlacementLabel = (rank: number) => {
  const normalized = Math.max(1, Math.floor(rank));
  const mod100 = normalized % 100;
  let suffix = 'th';

  if (mod100 < 11 || mod100 > 13) {
    switch (normalized % 10) {
      case 1:
        suffix = 'st';
        break;
      case 2:
        suffix = 'nd';
        break;
      case 3:
        suffix = 'rd';
        break;
    }
  }

  return `${normalized}${suffix} place`;
};

export default function HomePage() {
  const router = useRouter();
  const { gameId, loading, setGameId } = useActiveGameId();
  const game = useLiveGame(gameId);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [rounds, setRounds] = useState(DEFAULT_TOTAL_ROUNDS);
  const [recentGame, setRecentGame] = useState<GameWithResults | null>(null);
  const [isRecentGameLoading, setIsRecentGameLoading] = useState(true);

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

  useEffect(() => {
    let isMounted = true;
    const loadLatest = async () => {
      setIsRecentGameLoading(true);
      try {
        const [latestGame] = await fetchCompletedGames(1);
        if (!isMounted) {
          return;
        }
        setRecentGame(latestGame ?? null);
      } catch (fetchError) {
        console.error('Error fetching the latest completed game', fetchError);
      } finally {
        if (isMounted) {
          setIsRecentGameLoading(false);
        }
      }
    };
    loadLatest();
    return () => {
      isMounted = false;
    };
  }, []);

  const heroStatusText = useMemo(() => {
    if (loading) {
      return 'Checking for active games…';
    }
    if (game) {
      const nextRound = Math.max(1, game.roundsPlayed + 1);
      const clamped = Math.min(nextRound, game.totalRounds);
      return `Round ${clamped} of ${game.totalRounds} is ready to continue.`;
    }
    return '';
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
        <h1>Hsu 🏠 Big Two</h1>
      </header>

      <section className="card hero-card">
        {heroStatusText ? (
          <p className="status-text">
            {game ? <span className="status-indicator" /> : null}
            {heroStatusText}
          </p>
        ) : null}
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
        <div className="recent-result-card">
          <div className="recent-result-header">
            <p className="recent-result-title">Last completed match</p>
            {recentGame ? (
              <span className="recent-result-rounds">
                {recentGame.roundsPlayed}/{recentGame.totalRounds} rounds
              </span>
            ) : null}
          </div>
          {isRecentGameLoading ? (
            <p className="recent-result-message">Loading results…</p>
          ) : recentGame ? (
            <div className="podium">
              {recentGame.results.map((result) => {
                const profile = PLAYER_PROFILES[result.playerId];
                const isWinner = result.rank === 1;
                return (
                  <article
                    key={result.playerId}
                    className={`podium-card ${isWinner ? 'winner' : ''}`}
                  >
                    <div
                      className={`avatar ${isWinner ? 'large' : ''}`}
                      style={{ background: profile.placeholderColor }}
                    >
                      {result.playerId}
                    </div>
                    <div className="podium-content">
                      <div className="podium-meta">
                        <p className="placement">
                          {formatPlacementLabel(result.rank)}
                        </p>
                        <h3>{profile.fullName}</h3>
                      </div>
                      <p className="points">{result.totalPoints} points</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="recent-result-message">No completed games yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

