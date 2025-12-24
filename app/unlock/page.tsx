import { Suspense } from 'react';
import UnlockClient from './unlockClient';

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <div className="home-layout">
          <header className="home-header">
            <h1>Big Two</h1>
            <p className="text-muted" style={{ marginTop: '0.35rem' }}>
              Loading…
            </p>
          </header>
        </div>
      }
    >
      <UnlockClient />
    </Suspense>
  );
}


