'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchCompletedGames,
  type GameWithResults,
} from '../../../lib/firestore-helpers';
import { PLAYER_ORDER, PLAYER_PROFILES } from '../../../lib/constants';
import { TagEditor } from '../../components/TagEditor';

type PlacementSummary = Record<
  string,
  {
    first: number;
    second: number;
    third: number;
    fourth: number;
  }
>;

export default function HistoryPage() {
  const [games, setGames] = useState<GameWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taggingContext, setTaggingContext] = useState<{ id: string; label: string } | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const completed = await fetchCompletedGames();
        if (!mounted) return;
        setGames(completed);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load history.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const placements: PlacementSummary = {};
    PLAYER_ORDER.forEach((playerId) => {
      placements[playerId] = { first: 0, second: 0, third: 0, fourth: 0 };
    });
    games.forEach((game) => {
      game.results.forEach((result) => {
        const bucket = placements[result.playerId];
        if (!bucket) return;
        switch (result.rank) {
          case 1:
            bucket.first += 1;
            break;
          case 2:
            bucket.second += 1;
            break;
          case 3:
            bucket.third += 1;
            break;
          case 4:
            bucket.fourth += 1;
            break;
          default:
            break;
        }
      });
    });
    return placements;
  }, [games]);

  const tableRows = useMemo(() => {
    const dateCounters = new Map<string, number>();
    const ordinalById = new Map<string, number>();
    const chronologicalGames = [...games].sort((a, b) => {
      const aTime = a.endedAt?.getTime() ?? 0;
      const bTime = b.endedAt?.getTime() ?? 0;
      return aTime - bTime;
    });

    chronologicalGames.forEach((game) => {
      const dateKey = game.endedAt
        ? new Intl.DateTimeFormat('en-CA').format(game.endedAt)
        : 'unknown';
      const count = (dateCounters.get(dateKey) ?? 0) + 1;
      dateCounters.set(dateKey, count);
      ordinalById.set(game.id, count);
    });

    const sortedGames = [...games].sort((a, b) => {
      const aTime = a.endedAt?.getTime() ?? 0;
      const bTime = b.endedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return sortedGames.map((game) => {
      const dateKey = game.endedAt
        ? new Intl.DateTimeFormat('en-CA').format(game.endedAt)
        : 'unknown';
      const prettyDate = game.endedAt
        ? new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(game.endedAt)
        : 'Unknown date';
      const count = ordinalById.get(game.id) ?? 1;
      const label = count > 1 ? `${prettyDate} (${count})` : prettyDate;
      const scores = PLAYER_ORDER.reduce<Record<string, number | string>>(
        (acc, playerId) => {
          const result = game.results.find((entry) => entry.playerId === playerId);
          acc[playerId] = result ? result.totalPoints : '--';
          return acc;
        },
        {},
      );
      return {
        id: game.id,
        label,
        rounds: game.totalRounds,
        tag: game.tag,
        ...scores,
      };
    });
  }, [games]);

  const taggingGame = useMemo(
    () => games.find((game) => game.id === taggingContext?.id) ?? null,
    [games, taggingContext],
  );

  return (
    <div className="history-page">
      <header>
        <h1>History</h1>
        <p>Ledger of every completed game and lifetime placements.</p>
      </header>

      {loading ? <p>Loading history…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <>
          <section className="card">
            <h2>Placement summary</h2>
            <div className="summary-grid">
              {PLAYER_ORDER.map((playerId) => {
                const stats = summary[playerId];
                return (
                  <article key={playerId} className="summary-card">
                    <div
                      className="avatar"
                      style={{ backgroundColor: PLAYER_PROFILES[playerId].placeholderColor }}
                    >
                      {playerId}
                    </div>
                    <div className="summary-content">
                      <h3>{PLAYER_PROFILES[playerId].fullName}</h3>
                      <dl>
                        <div>
                          <dt>1st</dt>
                          <dd>{stats.first}</dd>
                        </div>
                        <div>
                          <dt>2nd</dt>
                          <dd>{stats.second}</dd>
                        </div>
                        <div>
                          <dt>3rd</dt>
                          <dd>{stats.third}</dd>
                        </div>
                        <div>
                          <dt>4th</dt>
                          <dd>{stats.fourth}</dd>
                        </div>
                      </dl>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2>Games</h2>
            {tableRows.length === 0 ? (
              <p>No completed games yet.</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Rounds</th>
                      {PLAYER_ORDER.map((playerId) => (
                        <th key={playerId}>{playerId}</th>
                      ))}
                      <th>Tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr
                        key={row.id}
                        className={row.tag ? undefined : 'clickable-row'}
                        onClick={() => {
                          if (row.tag) return;
                          setTaggingContext({ id: row.id, label: row.label });
                        }}
                      >
                        <td>{row.label}</td>
                        <td>{row.rounds}</td>
                        {PLAYER_ORDER.map((playerId) => (
                          <td key={playerId}>{row[playerId] ?? '--'}</td>
                        ))}
                        <td>{row.tag ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
      {taggingGame ? (
        <div className="modal-overlay" onClick={() => setTaggingContext(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <header className="modal-header">
              <div>
                <p className="eyebrow">Tag Game</p>
                <h3>{taggingContext?.label ?? 'Game'}</h3>
                <p className="text-muted">
                  Assign a tag. Suggestions reuse your recent tags and the most recent game.
                </p>
              </div>
              <button className="secondary-button ghost" onClick={() => setTaggingContext(null)}>
                ✕
              </button>
            </header>
            <TagEditor
              gameId={taggingGame.id}
              currentTag={taggingGame.tag ?? null}
              autoFocus
              onTagChange={(next) => {
                setGames((prev) =>
                  prev.map((game) => (game.id === taggingGame.id ? { ...game, tag: next } : game)),
                );
                setTaggingContext(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

