'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchGame, fetchGameResults, type GameDoc } from '../../../../../../lib/firestore-helpers';

type AvatarMap = Record<string, string>;

export default function EndResultsLoadingPage() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params?.gameId;

  const [game, setGame] = useState<GameDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const avatarsKey = useMemo(() => {
    if (!gameId) return null;
    return `endAvatars:${gameId}`;
  }, [gameId]);

  const goReveal = () => {
    if (!gameId) return;
    router.replace(`/game/${gameId}/end?ready=1`);
  };

  useEffect(() => {
    if (!gameId || !avatarsKey) return;

    let cancelled = false;
    setError(null);

    // v3: Always show for 2.0s (matches animation timing), but allow tap to skip immediately.
    timeoutRef.current = window.setTimeout(goReveal, 2000) as unknown as number;

    (async () => {
      try {
        const [gameData, results] = await Promise.all([fetchGame(gameId), fetchGameResults(gameId)]);
        if (!cancelled) setGame(gameData);
        const pairs = await Promise.all(
          results.map(async (r) => {
            const res = await fetch(
              `/api/avatars/random?playerId=${encodeURIComponent(r.playerId)}&rank=${r.rank}`,
              { cache: 'no-store' },
            );
            const data = (await res.json()) as { url?: string };
            return [r.playerId, data.url ?? ''] as const;
          }),
        );

        if (cancelled) return;

        const map: AvatarMap = {};
        for (const [playerId, url] of pairs) {
          if (url) map[playerId] = url;
        }

        window.sessionStorage.setItem(avatarsKey, JSON.stringify(map));

        // Warm the browser cache so images appear immediately on reveal.
        Object.values(map).forEach((url) => {
          const img = new Image();
          img.src = url;
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to preload results.');
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [avatarsKey, gameId]);

  const handleTap = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    goReveal();
  };

  const endedAtText = game?.endedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(game.endedAt)
    : null;

  return (
    <div
      className="end-reveal end-loading"
      onClick={handleTap}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleTap();
        }
      }}
      role="button"
      tabIndex={0}
      aria-busy
    >
      <header className="end-reveal-header" aria-live="polite">
        <h1 className="end-reveal-title">Hsu Big Two</h1>
        {endedAtText ? <p className="end-reveal-subtitle">{endedAtText}</p> : null}
      </header>

      <section className="end-reveal-stage" aria-label="Results loading stage">
        <div className="end-loading-stage">
          <div className="end-loading-text">
            <div className="end-loading-title">Results Loading</div>
            {error ? <div className="error-text">{error}</div> : null}
          </div>

          <div className="end-loading-cards" aria-hidden>
            <div className="end-loading-card c1" />
            <div className="end-loading-card c2" />
            <div className="end-loading-card c3" />
            <div className="end-loading-card c4 spade">
              <div className="end-loading-card-corner tl">
                <span className="rank">2</span>
                <span className="suit">♠</span>
              </div>
              <div className="end-loading-card-corner br" aria-hidden>
                <span className="rank">2</span>
                <span className="suit">♠</span>
              </div>
              <div className="end-loading-card-pip p1" aria-hidden>
                ♠
              </div>
              <div className="end-loading-card-pip p2" aria-hidden>
                ♠
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


