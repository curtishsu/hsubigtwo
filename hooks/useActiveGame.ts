'use client';

import { useEffect, useState } from 'react';
import { GameDoc, subscribeToGame, findActiveGameId } from '../lib/firestore-helpers';

export function useActiveGameId() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    findActiveGameId()
      .then((id) => {
        if (isMounted) {
          setGameId(id);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return { gameId, loading, setGameId };
}

export function useLiveGame(gameId: string | null) {
  const [game, setGame] = useState<GameDoc | null>(null);

  useEffect(() => {
    if (!gameId) {
      setGame(null);
      return;
    }
    const unsubscribe = subscribeToGame(gameId, setGame);
    return () => unsubscribe();
  }, [gameId]);

  return game;
}


