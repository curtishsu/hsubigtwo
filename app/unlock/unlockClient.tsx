'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

export default function UnlockClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get('next') || '/', [searchParams]);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = /^\d{4}$/.test(pin) && !loading;

  async function submit() {
    if (!/^\d{4}$/.test(pin) || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Incorrect PIN');
        setPin('');
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="home-layout">
      <header className="home-header">
        <h1>Big Two</h1>
        <p className="text-muted" style={{ marginTop: '0.35rem' }}>
          Enter the 4-digit family PIN to continue.
        </p>
      </header>

      <section className="card hero-card">
        <div className="start-controls" style={{ width: '100%', maxWidth: 320 }}>
          <label htmlFor="pin">Family PIN</label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\\d{4}"
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              const next = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
              setPin(next);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
            disabled={loading}
            autoFocus
          />
          {error ? <p className="error-text">{error}</p> : null}
        </div>

        <button className="primary-button" onClick={() => void submit()} disabled={!canSubmit}>
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </section>
    </div>
  );
}


