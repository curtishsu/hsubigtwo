'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchCompletedGames,
  type GameWithResults,
} from '../../../lib/firestore-helpers';
import { PLAYER_ORDER, PLAYER_PROFILES } from '../../../lib/constants';

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
    const dateCounter = new Map<string, number>();
    return games.map((game) => {
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
      const count = (dateCounter.get(dateKey) ?? 0) + 1;
      dateCounter.set(dateKey, count);
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
                      <h3>{PLAYER_PROFILES[playerId].displayName}</h3>
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
                      <tr key={row.id}>
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
    </div>
  );
}

