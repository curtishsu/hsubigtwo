'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
} from '../../lib/auth';

type SanityDoc = {
  id: string;
  data: Record<string, unknown>;
};

export default function FirebaseSanityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [docs, setDocs] = useState<SanityDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const sanityCollection = useMemo(() => collection(db, 'sanity'), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsubscribe();
  }, []);

  const writeTestDoc = async () => {
    setError(null);
    try {
      await addDoc(sanityCollection, {
        ok: true,
        createdAt: Date.now(),
        uid: user?.uid ?? null,
      });
      await readLatestDocs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error writing document.');
    }
  };

  const readLatestDocs = async () => {
    setError(null);
    setLoading(true);
    try {
      const q = query(sanityCollection, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      const nextDocs: SanityDoc[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data() as Record<string, unknown>,
      }));
      setDocs(nextDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error reading documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPassword = async (action: 'signUp' | 'signIn') => {
    setError(null);
    try {
      if (!email || !password) {
        throw new Error('Email and password are required.');
      }
      if (action === 'signUp') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication error.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOutUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out error.');
    }
  };

  return (
    <main style={{ padding: '1.5rem', display: 'grid', gap: '1rem' }}>
      <section>
        <h1>Firebase Sanity Check</h1>
        <p>
          Use the controls below to verify Firestore reads/writes and Firebase Auth.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '0.75rem' }}>
        <h2>Auth</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '20rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: '0.5rem' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ padding: '0.5rem' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => handleEmailPassword('signUp')}>Sign up</button>
            <button onClick={() => handleEmailPassword('signIn')}>Sign in</button>
            <button onClick={handleGoogleSignIn}>Sign in with Google</button>
            <button onClick={handleSignOut} disabled={!user}>Sign out</button>
          </div>
        </div>
        <div>
          <strong>Current user:</strong>{' '}
          {user ? `${user.email ?? user.uid} (${user.uid})` : 'None'}
        </div>
      </section>

      <section style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={writeTestDoc}>Write test doc</button>
        <button onClick={readLatestDocs}>Read latest docs</button>
      </section>

      {error ? (
        <div style={{ color: 'red' }}>
          <strong>Error:</strong> {error}
        </div>
      ) : null}

      <section>
        <h2>Latest Documents</h2>
        {loading ? <p>Loading...</p> : null}
        {docs.length === 0 ? <p>No docs fetched yet.</p> : null}
        <ul style={{ display: 'grid', gap: '0.5rem', padding: 0, listStyle: 'none' }}>
          {docs.map((doc) => (
            <li
              key={doc.id}
              style={{ border: '1px solid #ccc', borderRadius: '0.5rem', padding: '0.75rem' }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify({ id: doc.id, ...doc.data }, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}


