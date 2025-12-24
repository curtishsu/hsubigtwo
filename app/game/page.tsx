'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  endGame,
  setRoundScore,
  toggleHideScores,
  updateTotalRounds,
  type RoundScoreDoc,
} from '../../lib/firestore-helpers';
import { PLAYER_ORDER, PLAYER_PROFILES, type PlayerInitial } from '../../lib/constants';
import { useActiveGameId, useLiveGame } from '../../hooks/useActiveGame';
import { RoundWithScores, useRoundsWithScores } from '../../hooks/useRounds';
import { TagEditor } from '../components/TagEditor';

type EditingCell = { roundIndex: number; playerId: PlayerInitial } | null;

const keypadNumbers = Array.from({ length: 14 }, (_, index) => index);

export default function GamePage() {
  const router = useRouter();
  const { gameId, loading, setGameId } = useActiveGameId();
  const game = useLiveGame(gameId);
  const { rounds, totals, currentRoundIndex } = useRoundsWithScores(game?.id ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roundsInput, setRoundsInput] = useState(game?.totalRounds ?? 10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [error, setError] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (game?.totalRounds) {
      setRoundsInput(game.totalRounds);
    }
  }, [game]);

  useEffect(() => {
    if (editing) {
      const element = rowRefs.current[editing.roundIndex];
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [editing]);

  useEffect(() => {
    // Only redirect home when idle with no active game; avoid firing during end-game transition
    if (!loading && !ending && !game && !gameId) {
      router.replace('/');
    }
  }, [loading, ending, game, gameId, router]);

  const startedDate = useMemo(() => {
    if (!game?.startedAt) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(game.startedAt);
  }, [game?.startedAt]);

  const currentRoundLabel = useMemo(() => {
    if (!game) return '';
    const completed = rounds.filter((round) =>
      PLAYER_ORDER.every((player) => round.scores[player]?.points != null),
    ).length;
    const nextRound = Math.min(game.totalRounds, completed + 1);
    return `${nextRound} of ${game.totalRounds}`;
  }, [game, rounds]);

  const currentEditingValue = useMemo(() => {
    if (!editing || !rounds[editing.roundIndex]) return null;
    return rounds[editing.roundIndex].scores[editing.playerId]?.points ?? null;
  }, [editing, rounds]);

  const allRoundsCompleted = useMemo(() => {
    if (!rounds.length) return false;
    return rounds.every((round) =>
      PLAYER_ORDER.every((player) => round.scores[player]?.points != null),
    );
  }, [rounds]);

  const gameIsActive = game?.status === 'active';

  const startEditingCell = (roundIndex: number, playerId: PlayerInitial) => {
    setEditing({ roundIndex, playerId });
    setError(null);
  };

  const clearEditing = () => {
    setEditing(null);
  };

  const findNextCell = (
    roundIndex: number,
    playerId: PlayerInitial,
    list: RoundWithScores[],
  ): EditingCell => {
    if (!list.length) return null;
    const currentRound = list[roundIndex];
    if (!currentRound) return null;
    const currentIndex = PLAYER_ORDER.indexOf(playerId);

    for (let offset = 1; offset < PLAYER_ORDER.length; offset += 1) {
      const nextIndex = (currentIndex + offset) % PLAYER_ORDER.length;
      const nextPlayer = PLAYER_ORDER[nextIndex];
      const score = currentRound.scores[nextPlayer];
      if (score?.points == null) {
        return { roundIndex, playerId: nextPlayer };
      }
    }

    for (let r = roundIndex + 1; r < list.length; r += 1) {
      for (let idx = 0; idx < PLAYER_ORDER.length; idx += 1) {
        const candidate = PLAYER_ORDER[idx];
        const score = list[r].scores[candidate];
        if (score?.points == null) {
          return { roundIndex: r, playerId: candidate };
        }
      }
    }

    return null;
  };

  const findPreviousCell = (
    roundIndex: number,
    playerId: PlayerInitial,
    list: RoundWithScores[],
  ): EditingCell => {
    if (!list.length) return null;
    const currentRound = list[roundIndex];
    if (!currentRound) return null;
    const currentIndex = PLAYER_ORDER.indexOf(playerId);

    for (let offset = 1; offset < PLAYER_ORDER.length; offset += 1) {
      const prevIndex = (currentIndex - offset + PLAYER_ORDER.length) % PLAYER_ORDER.length;
      const candidate = PLAYER_ORDER[prevIndex];
      return { roundIndex, playerId: candidate };
    }

    for (let r = roundIndex - 1; r >= 0; r -= 1) {
      for (let idx = PLAYER_ORDER.length - 1; idx >= 0; idx -= 1) {
        const candidate = PLAYER_ORDER[idx];
        return { roundIndex: r, playerId: candidate };
      }
    }
    return null;
  };

  const handleValueSelect = async (value: number) => {
    if (!editing || !game) return;
    const round = rounds[editing.roundIndex];
    if (!round) return;

    // Calculate next cell immediately based on optimistic update
    const existingScore = round.scores[editing.playerId];
    const simulatedScore: RoundScoreDoc = existingScore
      ? { ...existingScore, points: value }
      : {
          id: `${round.id}-${editing.playerId}`,
          playerId: editing.playerId,
          points: value,
          enteredAt: null,
        };
    const simulatedRound: RoundWithScores = {
      ...round,
      scores: {
        ...round.scores,
        [editing.playerId]: simulatedScore,
      },
    };
    const simulatedRounds = rounds.map((entry, idx) =>
      idx === editing.roundIndex ? simulatedRound : entry,
    );
    const nextCell = findNextCell(editing.roundIndex, editing.playerId, simulatedRounds);
    const roundCompleted = PLAYER_ORDER.every(
      (playerId) => simulatedRound.scores[playerId]?.points != null,
    );

    // Update UI immediately (optimistic update)
    if (roundCompleted) {
      clearEditing();
    } else if (nextCell) {
      setEditing(nextCell);
    } else {
      setEditing(null);
    }

    // Save to Firebase in background
    try {
      await setRoundScore(game.id, round.id, editing.playerId, value);
      setFeedback(`Saved ${value} for ${editing.playerId}`);
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save score.';
      setError(message);
    }
  };

  const handleClearValue = async () => {
    if (!editing || !game) return;
    const round = rounds[editing.roundIndex];
    if (!round) return;
    
    // Save to Firebase in background
    try {
      await setRoundScore(game.id, round.id, editing.playerId, null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to clear score.';
      setError(message);
    }
  };

  const handlePrevCell = () => {
    if (!editing) return;
    const prev = findPreviousCell(editing.roundIndex, editing.playerId, rounds);
    if (prev) {
      setEditing(prev);
    }
  };

  const handleNextCell = () => {
    if (!editing) return;
    const next = findNextCell(editing.roundIndex, editing.playerId, rounds);
    if (next) {
      setEditing(next);
    }
  };

  const handleUpdateRounds = async () => {
    if (!game) return;
    try {
      setFeedback(null);
      setError(null);
      await updateTotalRounds(game.id, roundsInput);
      setFeedback('Updated total rounds');
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update rounds.');
    }
  };

  const handleHideToggle = async () => {
    if (!game) return;
    try {
      await toggleHideScores(game.id, !game.hideScores);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to toggle scores.');
    }
  };

  const executeEndGame = useCallback(async () => {
    if (!game) return;
    setEnding(true);
    try {
      await endGame(game.id, 'completed');
      await router.push(`/game/${game.id}/end/loading`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to end game.');
    } finally {
      setEnding(false);
    }
  }, [game, router]);

  const handleEndGame = () => {
    executeEndGame();
  };

  useEffect(() => {
    if (allRoundsCompleted && gameIsActive && !ending) {
      executeEndGame();
    }
  }, [allRoundsCompleted, gameIsActive, ending, executeEndGame]);

  const handleAbandonGame = async () => {
    if (!game) return;
    setEnding(true);
    try {
      await endGame(game.id, 'abandoned');
      setGameId(null);
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to abandon game.');
    } finally {
      setEnding(false);
    }
  };

  if (!game && loading) {
    return (
      <main className="game-screen loading-state">
        <p>Loading game…</p>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="game-screen">
        <div className="card">
          <p>No active game. Start one from the home screen.</p>
          <Link href="/" className="primary-button">
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="game-screen">
      <header className="game-header" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
        <div className="game-controls" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>
          <button className="menu-toggle" onClick={() => setMenuOpen((prev) => !prev)}>
            ☰
          </button>
        </div>
        <h1 style={{ margin: 0 }}>Hsu Big Two</h1>
        <p style={{ margin: '0.25rem 0 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {startedDate}
          {game.tag ? (
            <>
              <span style={{ color: 'rgba(16, 24, 40, 0.4)' }}>|</span>
              <span className="tag-chip" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                <span>{game.tag}</span>
              </span>
            </>
          ) : null}
        </p>
      </header>

      <section className="game-status">
        {error ? <span className="error-text">{error}</span> : null}
      </section>

      <section className={game.hideScores ? 'score-table blurred' : 'score-table'}>
        <div className="score-header">
          <div className="score-cell round-label">Round</div>
                {PLAYER_ORDER.map((playerId) => {
                  const profile = PLAYER_PROFILES[playerId];
                  const showLabel = profile.displayName !== playerId;
                  return (
                    <div key={playerId} className="score-cell player-header">
                      <div
                        className="avatar"
                        style={{ backgroundColor: profile.placeholderColor }}
                        aria-hidden
                      >
                        {playerId}
                      </div>
                      {showLabel ? <span>{profile.displayName}</span> : null}
                    </div>
                  );
                })}
        </div>
        <div className="score-body">
          {rounds.map((round, index) => {
            const isCurrent = index === currentRoundIndex;
            return (
              <div
                key={round.id}
                className={isCurrent ? 'score-row current-row' : 'score-row'}
                ref={(element) => {
                  rowRefs.current[index] = element;
                }}
              >
                <div className="score-cell round-index">
                  <span>{round.roundNumber}</span>
                </div>
                {PLAYER_ORDER.map((playerId) => {
                  const score = round.scores[playerId];
                  const isEditing =
                    editing?.roundIndex === index && editing.playerId === playerId;
                  return (
                    <button
                      key={playerId}
                      className={isEditing ? 'score-cell value editing' : 'score-cell value'}
                      onClick={() => startEditingCell(index, playerId)}
                    >
                      {score?.points ?? '--'}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <section className={game.hideScores ? 'totals blurred' : 'totals'}>
        <h2>Totals</h2>
        <div className="totals-grid">
          {PLAYER_ORDER.map((playerId) => (
            <div key={playerId} className="total-chip">
              <span>{PLAYER_PROFILES[playerId].fullName}</span>
              <strong>{totals[playerId]}</strong>
            </div>
          ))}
        </div>
      </section>

      {menuOpen ? (
        <aside className="game-menu">
          <header>
            <h2>Game Options</h2>
            <button onClick={() => setMenuOpen(false)}>✕</button>
          </header>
          <div className="menu-content">
            <div className="menu-section menu-section--rounds">
              <label className="menu-section-title" htmlFor="rounds-total">
                Number of Rounds
              </label>
              <input
                id="rounds-total"
                type="number"
                min={1}
                max={30}
                value={roundsInput}
                aria-label="Number of rounds"
                onChange={(event) => setRoundsInput(Number(event.target.value))}
              />
              <button
                onClick={handleUpdateRounds}
                className="update-rounds-button"
              >
                Update rounds
              </button>
            </div>
            <div className="menu-section">
              <label className="menu-section-title" htmlFor="game-tag">
                Tag Game
              </label>
              <TagEditor
                gameId={game.id}
                currentTag={game.tag ?? null}
                inputId="game-tag"
                onTagChange={(next) => {
                  setFeedback(next ? 'Tag saved' : 'Tag removed');
                  setTimeout(() => setFeedback(null), 2000);
                }}
              />
            </div>
            <div className="menu-section">
              <div className="menu-section-title">Game State</div>
              <div className="game-state-actions">
                <button
                  onClick={handleEndGame}
                  className="primary-button"
                  disabled={ending}
                >
                  {ending ? 'Ending…' : 'End game'}
                </button>
                <button onClick={handleAbandonGame} className="danger-button">
                  Discard game
                </button>
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      {editing ? (
        <div className="keypad-overlay" onClick={clearEditing}>
          <div className="keypad" onClick={(event) => event.stopPropagation()}>
            <header className="keypad-header">
              <div>
                <h3>
                  Round {rounds[editing.roundIndex]?.roundNumber} ·{' '}
                  {PLAYER_PROFILES[editing.playerId].displayName}
                </h3>
              </div>
              <button onClick={clearEditing} className="secondary-button ghost">
                Done
              </button>
            </header>
            <div className="keypad-grid">
              {keypadNumbers.map((value) => (
                <button
                  key={value}
                  className={
                    currentEditingValue === value ? 'keypad-btn selected' : 'keypad-btn'
                  }
                  onClick={() => handleValueSelect(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="keypad-actions">
              <button onClick={handlePrevCell} className="secondary-button">
                ← Prev
              </button>
              <button onClick={handleClearValue} className="secondary-button">
                Clear
              </button>
              <button onClick={handleNextCell} className="secondary-button">
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {allRoundsCompleted && !menuOpen ? (
        <div className="completion-banner">
          <p>All rounds filled! Open the menu to end the game 🎉</p>
        </div>
      ) : null}
    </main>
  );
}

