'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchLatestCompletedGame } from '../../../lib/firestore-helpers';

export default function GameEndPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        router.replace(`/game/${latestGame.id}/end/loading`);
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
  }, [router]);

  if (loading) {
    return (
      <main className="end-screen">
        <p>Loading end-of-game reveal…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="end-screen">
        <p className="error-text">{error}</p>
        <button className="primary-button" onClick={() => router.replace('/')}>
          Back home
        </button>
      </main>
    );
  }

  return (
    <main className="end-screen">
      <p>Redirecting…</p>
    </main>
  );
}

