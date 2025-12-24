'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { fetchGame, fetchGameResults, type GameResultDoc, type GameDoc } from '../../../../../lib/firestore-helpers';
import { PLAYER_PROFILES, type PlayerInitial } from '../../../../../lib/constants';

type ResultWithProfile = GameResultDoc & {
  displayName: string;
};

type Step =
  | 'intro'
  | 'show4'
  | 'dock4'
  | 'show3'
  | 'dock3'
  | 'show2'
  | 'dock2'
  | 'show1'
  | 'celebrate'
  | 'settled';

const STEPS: Step[] = [
  'intro',
  'show4',
  'dock4',
  'show3',
  'dock3',
  'show2',
  'dock2',
  'show1',
  'celebrate',
  'settled',
];

function stepDurationMs(step: Step) {
  switch (step) {
    case 'intro':
      return 300;
    case 'show4':
    case 'show3':
    case 'show2':
      // v3: keep docking snappy, but linger on the hero moment
      return 1500;
    case 'dock4':
    case 'dock3':
    case 'dock2':
      return 800;
    case 'show1':
      // v3: 1.5x longer hero moment for winner
      return 2100;
    case 'celebrate':
      return 1400;
    case 'settled':
      return null;
    default:
      return null;
  }
}

function bannerText(step: Step) {
  switch (step) {
    case 'show4':
    case 'dock4':
      return '4th Place';
    case 'show3':
    case 'dock3':
      return '3rd Place';
    case 'show2':
    case 'dock2':
      return '2nd Place';
    case 'show1':
    case 'celebrate':
    case 'settled':
      return 'First Place';
    default:
      return '';
  }
}

function bannerMedal(step: Step) {
  switch (step) {
    case 'show3':
    case 'dock3':
      return '🥉';
    case 'show2':
    case 'dock2':
      return '🥈';
    case 'show1':
    case 'celebrate':
    case 'settled':
      return '🥇';
    default:
      return null;
  }
}

function ordinal(rank: number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return `${rank}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

export default function EndGameRevealPage() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params?.gameId;

  const [game, setGame] = useState<GameDoc | null>(null);
  const [results, setResults] = useState<ResultWithProfile[]>([]);
  const [avatarByPlayerId, setAvatarByPlayerId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [confettiVisible, setConfettiVisible] = useState(false);
  const [confettiBurstId, setConfettiBurstId] = useState(0);

  const timeoutRef = useRef<number | null>(null);
  const confettiTimeoutRef = useRef<number | null>(null);

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  // v3: Always show the Results Loading interstitial first unless explicitly marked ready.
  useEffect(() => {
    if (!gameId) return;
    const ready = searchParams.get('ready') === '1';
    if (!ready) {
      router.replace(`/game/${gameId}/end/loading`);
    }
  }, [gameId, router, searchParams]);

  const revealSeenKey = useMemo(() => {
    if (!gameId) return null;
    return `endRevealSeen:${gameId}`;
  }, [gameId]);

  // v3: Hydrate prefetched avatar URLs immediately (so reveal doesn't wait on avatar API calls).
  useEffect(() => {
    if (!gameId) return;
    if (typeof window === 'undefined') return;
    const key = `endAvatars:${gameId}`;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === 'object') {
        setAvatarByPlayerId(parsed);
      }
    } catch {
      // ignore
    }
  }, [gameId]);

  const ranks = useMemo(() => {
    const byRank = new Map<number, ResultWithProfile>();
    results.forEach((r) => byRank.set(r.rank, r));
    return {
      first: byRank.get(1) ?? null,
      second: byRank.get(2) ?? null,
      third: byRank.get(3) ?? null,
      fourth: byRank.get(4) ?? null,
    };
  }, [results]);

  const isSettled = step === 'settled';

  useEffect(() => {
    if (!gameId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [gameData, rawResults] = await Promise.all([fetchGame(gameId), fetchGameResults(gameId)]);

        if (!mounted) return;

        if (!gameData) {
          setError('Game not found.');
          return;
        }

        setGame(gameData);

        const enriched = rawResults
          .slice()
          .sort((a, b) => a.rank - b.rank)
          .map((entry) => ({
            ...entry,
            displayName: PLAYER_PROFILES[entry.playerId].fullName,
          }));
        setResults(enriched);
        setAvatarByPlayerId({});

        // If user returns later, show settled state immediately.
        if (revealSeenKey && typeof window !== 'undefined') {
          const seen = window.localStorage.getItem(revealSeenKey) === '1';
          if (seen) {
            setStepIndex(STEPS.indexOf('settled'));
          } else {
            setStepIndex(0);
          }
        } else {
          setStepIndex(0);
        }
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
  }, [gameId, revealSeenKey]);

  useEffect(() => {
    if (results.length !== 4) return;
    let cancelled = false;

    (async () => {
      // v3: Only fetch missing avatars; otherwise we'd re-randomize and cause delay.
      const missing = results.filter((entry) => !avatarByPlayerId[entry.playerId]);
      if (missing.length === 0) return;

      const pairs = await Promise.all(
        missing.map(async (entry) => {
          try {
            const res = await fetch(
              `/api/avatars/random?playerId=${encodeURIComponent(entry.playerId)}&rank=${entry.rank}`,
              { cache: 'no-store' },
            );
            if (!res.ok) return [entry.playerId, ''] as const;
            const data = (await res.json()) as { url?: string };
            return [entry.playerId, data.url ?? ''] as const;
          } catch {
            return [entry.playerId, ''] as const;
          }
        }),
      );

      if (cancelled) return;
      setAvatarByPlayerId((prev) => {
        const next = { ...prev };
        for (const [playerId, url] of pairs) {
          if (url) next[playerId] = url;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [results, avatarByPlayerId]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearConfettiTimer = () => {
    if (confettiTimeoutRef.current) {
      window.clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = null;
    }
  };

  const advance = (reason: 'auto' | 'tap') => {
    setStepIndex((prev) => {
      const next = Math.min(prev + 1, STEPS.length - 1);
      return next;
    });
  };

  useEffect(() => {
    clearTimer();
    if (loading || error) return;
    if (results.length !== 4) return;

    const duration = stepDurationMs(step);
    if (duration == null) return;

    timeoutRef.current = window.setTimeout(() => {
      advance('auto');
    }, duration) as unknown as number;

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, loading, error, results.length]);

  // Confetti "burst" should be noticeable even if the user taps quickly through phases.
  // Trigger on entering celebrate, then fade out after a short duration (per spec).
  useEffect(() => {
    if (step !== 'celebrate') return;
    clearConfettiTimer();
    setConfettiBurstId((prev) => prev + 1);
    setConfettiVisible(true);
    confettiTimeoutRef.current = window.setTimeout(() => {
      setConfettiVisible(false);
      confettiTimeoutRef.current = null;
    }, 2400) as unknown as number;
    return () => clearConfettiTimer();
  }, [step]);

  // Mark reveal as seen once settled.
  useEffect(() => {
    if (!revealSeenKey) return;
    if (step !== 'settled') return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(revealSeenKey, '1');
  }, [revealSeenKey, step]);

  // If someone navigates directly to /game/end (legacy) we might land here without results.
  useEffect(() => {
    if (!loading && !error && results.length === 0) {
      // no-op; allow empty state to show
    }
  }, [loading, error, results.length]);

  const handleTap = () => {
    if (loading || error) return;
    clearTimer();
    // Ensure we never get stuck in an in-between state:
    // - tapping on "dock" steps should still advance cleanly.
    advance('tap');
  };

  const currentHeroRank = useMemo(() => {
    switch (step) {
      case 'show4':
      case 'dock4':
        return 4;
      case 'show3':
      case 'dock3':
        return 3;
      case 'show2':
      case 'dock2':
        return 2;
      case 'show1':
      case 'celebrate':
      case 'settled':
        return 1;
      default:
        return null;
    }
  }, [step]);

  const dockedRanks = useMemo(() => {
    // In final settled state, 2/3/4 are docked.
    // Before that, only already-revealed (and docked) ranks appear docked.
    const docked = new Set<number>();
    // Use strict ">" so we don't render a duplicate docked card during the dock animation step.
    if (stepIndex > STEPS.indexOf('dock4')) docked.add(4);
    if (stepIndex > STEPS.indexOf('dock3')) docked.add(3);
    if (stepIndex > STEPS.indexOf('dock2')) docked.add(2);
    return docked;
  }, [stepIndex]);

  const dockingRank = useMemo(() => {
    if (step === 'dock4') return 4;
    if (step === 'dock3') return 3;
    if (step === 'dock2') return 2;
    return null;
  }, [step]);

  const heroEntry = useMemo(() => {
    if (!currentHeroRank) return null;
    if (currentHeroRank === 1) return ranks.first;
    if (currentHeroRank === 2) return ranks.second;
    if (currentHeroRank === 3) return ranks.third;
    return ranks.fourth;
  }, [currentHeroRank, ranks.first, ranks.second, ranks.third, ranks.fourth]);

  const banner = bannerText(step);
  const medal = bannerMedal(step);

  if (loading) {
    // v3: The dedicated /end/loading page handles loading; don't show an extra screen here.
    return <div className="end-reveal" aria-busy />;
  }

  if (error) {
    return (
      <div className="end-reveal">
        <p className="error-text">{error}</p>
        <button className="secondary-button" onClick={() => router.replace('/')}>
          Go Home
        </button>
      </div>
    );
  }

  const endedAtText = game?.endedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(game.endedAt)
    : null;

  return (
    <div
      className="end-reveal"
      onClick={handleTap}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleTap();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="end-reveal-header" aria-live="polite">
        <h1 className="end-reveal-title">Hsu Big Two</h1>
        {endedAtText ? <p className="end-reveal-subtitle">{endedAtText}</p> : null}
      </header>

      <section className="end-reveal-stage" aria-label="Placement reveal stage">
        {banner ? (
          <div className="end-stage-chip" aria-hidden={step === 'intro'}>
            <div className="end-reveal-banner">
              <span className="end-reveal-banner-text">
                {medal ? (
                  <span className="end-reveal-banner-emoji" aria-hidden>
                    {medal}
                  </span>
                ) : null}
                <span className="end-reveal-banner-label">{banner}</span>
                {medal ? (
                  <span className="end-reveal-banner-emoji" aria-hidden>
                    {medal}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
        ) : null}

        {confettiVisible ? (
          <div className="end-stage-confetti" aria-hidden>
            <div className="end-stage-confetti-burst left">
              <span key={`c-left-popper-${confettiBurstId}`} className="end-stage-confetti-item popper">
                🎉
              </span>
              <span key={`c-left-streamer-${confettiBurstId}`} className="end-stage-confetti-item streamer">
                🎊
              </span>
            </div>
            <div className="end-stage-confetti-burst right">
              <span key={`c-right-popper-${confettiBurstId}`} className="end-stage-confetti-item popper">
                🎉
              </span>
              <span key={`c-right-streamer-${confettiBurstId}`} className="end-stage-confetti-item streamer">
                🎊
              </span>
            </div>
          </div>
        ) : null}

        {/* Docked cards (mini) */}
        {ranks.second && dockedRanks.has(2) ? (
          <PlayerCard
            key={`rank-2-${ranks.second.playerId}`}
            entry={ranks.second}
            rank={2}
            avatarSrc={avatarByPlayerId[ranks.second.playerId]}
            position="dock-left"
            size="mini"
            showBadge
          />
        ) : null}

        {ranks.third && dockedRanks.has(3) ? (
          <PlayerCard
            key={`rank-3-${ranks.third.playerId}`}
            entry={ranks.third}
            rank={3}
            avatarSrc={avatarByPlayerId[ranks.third.playerId]}
            position="dock-center"
            size="mini"
            showBadge
          />
        ) : null}

        {ranks.fourth && dockedRanks.has(4) ? (
          <PlayerCard
            key={`rank-4-${ranks.fourth.playerId}`}
            entry={ranks.fourth}
            rank={4}
            avatarSrc={avatarByPlayerId[ranks.fourth.playerId]}
            position="dock-right"
            size="mini"
            showBadge
          />
        ) : null}

        {/* Active hero card */}
        {heroEntry && step !== 'intro' ? (
          <PlayerCard
            key={`hero-${heroEntry.playerId}-${currentHeroRank}`}
            entry={heroEntry}
            rank={currentHeroRank as number}
            avatarSrc={avatarByPlayerId[heroEntry.playerId]}
            position={
              dockingRank && dockingRank === currentHeroRank
                ? // During dock steps, animate from hero to dock slot.
                  currentHeroRank === 4
                  ? 'dock-right'
                  : currentHeroRank === 3
                    ? 'dock-center'
                    : 'dock-left'
                : 'hero'
            }
            size={currentHeroRank === 1 ? 'hero' : dockingRank ? 'mini' : 'hero'}
            showBadge={false}
            animateIn={step.startsWith('show')}
          />
        ) : null}
      </section>

    </div>
  );
}

function PlayerCard({
  entry,
  rank,
  avatarSrc,
  position,
  size,
  showBadge,
  animateIn,
}: {
  entry: ResultWithProfile;
  rank: number;
  avatarSrc?: string;
  position: 'hero' | 'dock-left' | 'dock-center' | 'dock-right';
  size: 'hero' | 'mini';
  showBadge: boolean;
  animateIn?: boolean;
}) {
  const profile = PLAYER_PROFILES[entry.playerId as PlayerInitial];
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const className = [
    'end-player-card',
    `pos-${position}`,
    `size-${size}`,
    animateIn ? 'entering' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={className}>
      {showBadge ? <div className="end-player-badge">{ordinal(rank)}</div> : null}
      <div
        className={[
          'end-player-avatar',
          avatarLoaded ? 'is-loaded' : '',
          avatarError ? 'is-error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ backgroundColor: profile.placeholderColor }}
      >
        {avatarError ? (
          <span className="end-player-avatar-fallback" aria-hidden>
            {entry.playerId}
          </span>
        ) : null}
        <img
          src={avatarSrc || profile.avatarUrl}
          alt={entry.displayName}
          loading="lazy"
          onLoad={() => setAvatarLoaded(true)}
          onError={(e) => {
            // Keep dignity: if the image fails, fall back to the initial without showing a broken image icon.
            setAvatarError(true);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <div className="end-player-name">{entry.displayName}</div>
      <div className="end-player-points">{entry.totalPoints} points</div>
    </article>
  );
}


