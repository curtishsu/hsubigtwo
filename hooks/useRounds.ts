'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  RoundDoc,
  RoundScoreDoc,
  subscribeToRounds,
  subscribeToRoundScores,
} from '../lib/firestore-helpers';
import { PLAYER_ORDER, type PlayerInitial } from '../lib/constants';

export type RoundWithScores = RoundDoc & {
  scores: Record<PlayerInitial, RoundScoreDoc | null>;
};

export function useRoundsWithScores(gameId: string | null) {
  const [rounds, setRounds] = useState<RoundWithScores[]>([]);

  useEffect(() => {
    if (!gameId) {
      setRounds([]);
      return;
    }

    const roundScoresUnsubs = new Map<string, () => void>();

    const unsubscribeRounds = subscribeToRounds(gameId, (nextRounds) => {
      setRounds((prev) => {
        // ensure stable references
        const existing = new Map(prev.map((round) => [round.id, round]));
        return nextRounds.map((round) => {
          const prevRound = existing.get(round.id);
          if (prevRound) {
            return prevRound;
          }
          return {
            ...round,
            scores: PLAYER_ORDER.reduce((acc, playerId) => {
              acc[playerId] = null;
              return acc;
            }, {} as Record<PlayerInitial, RoundScoreDoc | null>),
          };
        });
      });

      // subscribe to scores for new rounds
      nextRounds.forEach((round) => {
        if (roundScoresUnsubs.has(round.id)) {
          return;
        }
        const unsubscribeScores = subscribeToRoundScores(gameId, round.id, (scores) => {
          setRounds((current) =>
            current.map((entry) => {
              if (entry.id !== round.id) {
                return entry;
              }
              const nextScores = { ...entry.scores };
              PLAYER_ORDER.forEach((playerId) => {
                nextScores[playerId] =
                  scores.find((score) => score.playerId === playerId) ?? null;
              });
              return {
                ...entry,
                scores: nextScores,
              };
            }),
          );
        });
        roundScoresUnsubs.set(round.id, unsubscribeScores);
      });

      // clean up removed rounds
      const nextIds = new Set(nextRounds.map((round) => round.id));
      roundScoresUnsubs.forEach((unsubscribe, roundId) => {
        if (!nextIds.has(roundId)) {
          unsubscribe();
          roundScoresUnsubs.delete(roundId);
        }
      });
    });

    return () => {
      unsubscribeRounds();
      roundScoresUnsubs.forEach((unsubscribe) => unsubscribe());
    };
  }, [gameId]);

  const totals = useMemo(() => {
    const accumulator = PLAYER_ORDER.reduce(
      (acc, playerId) => {
        acc[playerId] = 0;
        return acc;
      },
      {} as Record<PlayerInitial, number>,
    );

    rounds.forEach((round) => {
      PLAYER_ORDER.forEach((playerId) => {
        const score = round.scores[playerId];
        if (score?.points != null) {
          accumulator[playerId] += score.points;
        }
      });
    });

    return accumulator;
  }, [rounds]);

  const currentRoundIndex = useMemo(() => {
    if (!rounds.length) {
      return 0;
    }
    for (let index = 0; index < rounds.length; index += 1) {
      const round = rounds[index];
      const hasAllScores = PLAYER_ORDER.every(
        (playerId) => round.scores[playerId]?.points != null,
      );
      if (!hasAllScores) {
        return index;
      }
    }
    return Math.max(0, rounds.length - 1);
  }, [rounds]);

  return { rounds, totals, currentRoundIndex };
}

