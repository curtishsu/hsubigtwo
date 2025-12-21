import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_TOTAL_ROUNDS, PLAYER_ORDER, type PlayerInitial } from './constants';

export type GameStatus = 'active' | 'completed' | 'abandoned';

export interface GameDoc {
  id: string;
  startedAt: Date | null;
  endedAt: Date | null;
  totalRounds: number;
  roundsPlayed: number;
  status: GameStatus;
  hideScores: boolean;
  tag?: string | null;
  notes?: string | null;
}

export interface RoundDoc {
  id: string;
  roundNumber: number;
  locked: boolean;
}

export interface RoundScoreDoc {
  id: string;
  playerId: PlayerInitial;
  points: number | null;
  enteredAt: Date | null;
}

export interface GameResultDoc {
  playerId: PlayerInitial;
  rank: number;
  totalPoints: number;
}

export interface GameWithResults extends GameDoc {
  results: GameResultDoc[];
}

export const gamesCollection = collection(db, 'games');

export function gameDoc(gameId: string) {
  return doc(gamesCollection, gameId);
}

export function roundsCollection(gameId: string) {
  return collection(gameDoc(gameId), 'rounds');
}

export function roundDoc(gameId: string, roundId: string) {
  return doc(roundsCollection(gameId), roundId);
}

export function roundScoresCollection(gameId: string, roundId: string) {
  return collection(roundDoc(gameId, roundId), 'scores');
}

export function roundScoreDoc(gameId: string, roundId: string, playerId: PlayerInitial) {
  return doc(roundScoresCollection(gameId, roundId), playerId);
}

export async function ensurePlayersSeeded() {
  const playersCollection = collection(db, 'players');
  await Promise.all(
    PLAYER_ORDER.map(async (playerId) => {
      const playerRef = doc(playersCollection, playerId);
      const snapshot = await getDoc(playerRef);
      if (!snapshot.exists()) {
        await setDoc(playerRef, {
          initial: playerId,
          displayName: playerId,
          photoUrl: null,
          createdAt: serverTimestamp(),
        });
      }
    }),
  );
}

export async function findActiveGameId(): Promise<string | null> {
  const activeQuery = query(gamesCollection, where('status', '==', 'active'), limit(1));
  const snapshot = await getDocs(activeQuery);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].id;
}

export async function startNewGame(totalRounds: number = DEFAULT_TOTAL_ROUNDS): Promise<string> {
  const existingActiveId = await findActiveGameId();
  if (existingActiveId) {
    throw new Error('An active game already exists. End or discard it before starting a new one.');
  }

  const gameRef = await addDoc(gamesCollection, {
    startedAt: serverTimestamp(),
    endedAt: null,
    totalRounds,
    roundsPlayed: 0,
    status: 'active',
    hideScores: false,
    tag: null,
    notes: null,
  });

  const batchRounds = Array.from({ length: totalRounds }, (_, index) => index + 1);

  await Promise.all(
    batchRounds.map((roundNumber) => {
      const id = roundNumber.toString().padStart(2, '0');
      return setDoc(roundDoc(gameRef.id, id), {
        roundNumber,
        locked: false,
      });
    }),
  );

  return gameRef.id;
}

export async function updateTotalRounds(gameId: string, nextTotal: number) {
  if (nextTotal <= 0) {
    throw new Error('Total rounds must be greater than zero.');
  }

  const gameRef = gameDoc(gameId);
  const snapshot = await getDoc(gameRef);
  if (!snapshot.exists()) {
    throw new Error('Game not found.');
  }

  const currentTotal = snapshot.get('totalRounds') as number;
  const roundsPlayed = snapshot.get('roundsPlayed') as number;

  await updateDoc(gameRef, {
    totalRounds: nextTotal,
    roundsPlayed: Math.min(roundsPlayed, nextTotal),
  });

  if (nextTotal > currentTotal) {
    const toAdd = Array.from({ length: nextTotal - currentTotal }, (_, offset) => currentTotal + offset + 1);
    await Promise.all(
      toAdd.map((roundNumber) => {
        const id = roundNumber.toString().padStart(2, '0');
        return setDoc(roundDoc(gameId, id), {
          roundNumber,
          locked: false,
        });
      }),
    );
  } else if (nextTotal < currentTotal) {
    const toRemove = Array.from({ length: currentTotal - nextTotal }, (_, offset) => currentTotal - offset);
    await Promise.all(
      toRemove.map(async (roundNumber) => {
        const id = roundNumber.toString().padStart(2, '0');
        const roundRef = roundDoc(gameId, id);
        const scoresSnapshot = await getDocs(collection(roundRef, 'scores'));
        await Promise.all(scoresSnapshot.docs.map((scoreDoc) => deleteDoc(scoreDoc.ref)));
        await deleteDoc(roundRef);
      }),
    );
  }

  await syncRoundsProgress(gameId);
}

export async function setRoundScore(
  gameId: string,
  roundId: string,
  playerId: PlayerInitial,
  points: number | null,
) {
  const scoreRef = roundScoreDoc(gameId, roundId, playerId);
  if (points === null) {
    await deleteDoc(scoreRef).catch(() => undefined);
    return;
  }

  if (Number.isNaN(points) || points < 0 || points > 13) {
    throw new Error('Points must be between 0 and 13.');
  }

  await setDoc(
    scoreRef,
    {
      playerId,
      points,
      enteredAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function endGame(gameId: string, status: GameStatus = 'completed') {
  const gameRef = gameDoc(gameId);

  const snapshot = await getDoc(gameRef);
  if (!snapshot.exists()) {
    throw new Error('Game not found.');
  }

  const roundsSnapshot = await getDocs(
    query(roundsCollection(gameId), orderBy('roundNumber', 'asc')),
  );

  const scoreMatrix: Record<PlayerInitial, number> = {
    A: 0,
    Y: 0,
    D: 0,
    C: 0,
  };

  let completedRounds = 0;

  await Promise.all(
    roundsSnapshot.docs.map(async (roundDocSnapshot) => {
      const scoresSnapshot = await getDocs(collection(roundDocSnapshot.ref, 'scores'));
      let completedForRound = true;
      scoresSnapshot.forEach((score) => {
        const data = score.data();
        const playerId = data.playerId as PlayerInitial;
        const points = data.points as number | undefined;
        if (playerId && typeof points === 'number') {
          scoreMatrix[playerId] += points;
        } else {
          completedForRound = false;
        }
      });
      if (scoresSnapshot.size !== PLAYER_ORDER.length) {
        completedForRound = false;
      }
      if (completedForRound) {
        completedRounds += 1;
      }
    }),
  );

  const sorted = Object.entries(scoreMatrix)
    .map(([playerId, totalPoints]) => ({ playerId: playerId as PlayerInitial, totalPoints }))
    .sort((a, b) => a.totalPoints - b.totalPoints);

  const batch = writeBatch(db);

  sorted.forEach((entry, index) => {
    const rank = index + 1;
    const resultRef = doc(collection(gameRef, 'results'), entry.playerId);
    batch.set(resultRef, {
      playerId: entry.playerId,
      rank,
      totalPoints: entry.totalPoints,
    });
  });

  batch.update(gameRef, {
    status,
    endedAt: serverTimestamp(),
    roundsPlayed: Math.min(snapshot.get('totalRounds') as number, completedRounds),
  });

  await batch.commit();
}

export async function toggleHideScores(gameId: string, hide: boolean) {
  await updateDoc(gameDoc(gameId), {
    hideScores: hide,
  });
}

export function subscribeToGame(
  gameId: string,
  handler: (data: GameDoc | null) => void,
): Unsubscribe {
  const gameRef = gameDoc(gameId);
  return onSnapshot(gameRef, (snapshot) => {
    if (!snapshot.exists()) {
      handler(null);
      return;
    }
    const data = snapshot.data();
    handler({
      id: snapshot.id,
      startedAt: data.startedAt?.toDate?.() ?? null,
      endedAt: data.endedAt?.toDate?.() ?? null,
      totalRounds: data.totalRounds,
      roundsPlayed: data.roundsPlayed,
      status: data.status,
      hideScores: data.hideScores ?? false,
      tag: data.tag ?? null,
      notes: data.notes ?? null,
    });
  });
}

export function subscribeToRounds(
  gameId: string,
  handler: (rounds: RoundDoc[]) => void,
): Unsubscribe {
  const q = query(roundsCollection(gameId), orderBy('roundNumber', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const rounds = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        roundNumber: data.roundNumber,
        locked: data.locked ?? false,
      };
    });
    handler(rounds);
  });
}

export function subscribeToRoundScores(
  gameId: string,
  roundId: string,
  handler: (scores: RoundScoreDoc[]) => void,
): Unsubscribe {
  const q = query(roundScoresCollection(gameId, roundId), orderBy('playerId', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const scores = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        playerId: data.playerId as PlayerInitial,
        points: typeof data.points === 'number' ? data.points : null,
        enteredAt: data.enteredAt?.toDate?.() ?? null,
      };
    });
    handler(scores);
  });
}

export async function fetchLatestCompletedGame(): Promise<GameDoc | null> {
  const q = query(
    gamesCollection,
    where('status', '==', 'completed'),
    orderBy('endedAt', 'desc'),
    limit(1),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docSnapshot = snapshot.docs[0];
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    startedAt: data.startedAt?.toDate?.() ?? null,
    endedAt: data.endedAt?.toDate?.() ?? null,
    totalRounds: data.totalRounds,
    roundsPlayed: data.roundsPlayed,
    status: data.status,
    hideScores: data.hideScores ?? false,
    tag: data.tag ?? null,
    notes: data.notes ?? null,
  };
}

export async function fetchGameResults(gameId: string): Promise<GameResultDoc[]> {
  const resultsSnapshot = await getDocs(
    query(collection(gameDoc(gameId), 'results'), orderBy('rank', 'asc')),
  );
  return resultsSnapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      playerId: data.playerId as PlayerInitial,
      rank: data.rank as number,
      totalPoints: data.totalPoints as number,
    };
  });
}

export async function fetchCompletedGames(limitCount = 50): Promise<GameWithResults[]> {
  const q = query(
    gamesCollection,
    where('status', '==', 'completed'),
    orderBy('endedAt', 'desc'),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);

  const games = await Promise.all(
    snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      const results = await fetchGameResults(docSnapshot.id);
      return {
        id: docSnapshot.id,
        startedAt: data.startedAt?.toDate?.() ?? null,
        endedAt: data.endedAt?.toDate?.() ?? null,
        totalRounds: data.totalRounds,
        roundsPlayed: data.roundsPlayed,
        status: data.status,
        hideScores: data.hideScores ?? false,
        tag: data.tag ?? null,
        notes: data.notes ?? null,
        results,
      } as GameWithResults;
    }),
  );

  return games;
}

export async function fetchRecentCompletedGames(limitCount = 50): Promise<GameDoc[]> {
  const q = query(
    gamesCollection,
    where('status', '==', 'completed'),
    orderBy('endedAt', 'desc'),
    limit(limitCount),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      startedAt: data.startedAt?.toDate?.() ?? null,
      endedAt: data.endedAt?.toDate?.() ?? null,
      totalRounds: data.totalRounds,
      roundsPlayed: data.roundsPlayed,
      status: data.status,
      hideScores: data.hideScores ?? false,
      tag: data.tag ?? null,
      notes: data.notes ?? null,
    } as GameDoc;
  });
}

async function getCompletedRoundsCount(gameId: string): Promise<number> {
  const roundsSnapshot = await getDocs(query(roundsCollection(gameId), orderBy('roundNumber', 'asc')));

  let completed = 0;
  for (const roundDocSnapshot of roundsSnapshot.docs) {
    const scoresSnapshot = await getDocs(collection(roundDocSnapshot.ref, 'scores'));
    if (scoresSnapshot.size !== PLAYER_ORDER.length) {
      continue;
    }
    const allValid = scoresSnapshot.docs.every((docSnapshot) => {
      const data = docSnapshot.data();
      return typeof data.points === 'number';
    });
    if (allValid) {
      completed += 1;
    }
  }
  return completed;
}

export async function syncRoundsProgress(gameId: string) {
  const completed = await getCompletedRoundsCount(gameId);
  await updateDoc(gameDoc(gameId), {
    roundsPlayed: completed,
  });
}

export async function updateGameTag(gameId: string, tag: string | null) {
  const trimmed = tag?.trim() ?? '';
  if (!trimmed) {
    await updateDoc(gameDoc(gameId), { tag: null });
    return;
  }
  if (trimmed.length > 24) {
    throw new Error('Tag must be 24 characters or fewer.');
  }
  await updateDoc(gameDoc(gameId), {
    tag: trimmed,
  });
}

export async function deleteGame(gameId: string): Promise<GameWithResults> {
  const gameRef = gameDoc(gameId);
  const gameSnapshot = await getDoc(gameRef);
  
  if (!gameSnapshot.exists()) {
    throw new Error('Game not found.');
  }

  // Fetch game data and results for undo functionality
  const gameData = gameSnapshot.data();
  const results = await fetchGameResults(gameId);
  const deletedGame: GameWithResults = {
    id: gameSnapshot.id,
    startedAt: gameData.startedAt?.toDate?.() ?? null,
    endedAt: gameData.endedAt?.toDate?.() ?? null,
    totalRounds: gameData.totalRounds,
    roundsPlayed: gameData.roundsPlayed,
    status: gameData.status,
    hideScores: gameData.hideScores ?? false,
    tag: gameData.tag ?? null,
    notes: gameData.notes ?? null,
    results,
  };

  // Use batch to delete all subcollections and the game document
  const batch = writeBatch(db);

  // Delete results
  const resultsSnapshot = await getDocs(collection(gameRef, 'results'));
  resultsSnapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });

  // Delete rounds and their scores
  const roundsSnapshot = await getDocs(roundsCollection(gameId));
  await Promise.all(
    roundsSnapshot.docs.map(async (roundDocSnapshot) => {
      const scoresSnapshot = await getDocs(collection(roundDocSnapshot.ref, 'scores'));
      scoresSnapshot.docs.forEach((scoreDoc) => {
        batch.delete(scoreDoc.ref);
      });
      batch.delete(roundDocSnapshot.ref);
    }),
  );

  // Delete the game document itself
  batch.delete(gameRef);

  await batch.commit();

  return deletedGame;
}

export async function restoreGame(gameData: GameWithResults): Promise<void> {
  const gameRef = gameDoc(gameData.id);
  const batch = writeBatch(db);

  // Restore the game document
  batch.set(gameRef, {
    startedAt: gameData.startedAt,
    endedAt: gameData.endedAt,
    totalRounds: gameData.totalRounds,
    roundsPlayed: gameData.roundsPlayed,
    status: gameData.status,
    hideScores: gameData.hideScores,
    tag: gameData.tag,
    notes: gameData.notes,
  });

  // Restore results
  gameData.results.forEach((result) => {
    const resultRef = doc(collection(gameRef, 'results'), result.playerId);
    batch.set(resultRef, {
      playerId: result.playerId,
      rank: result.rank,
      totalPoints: result.totalPoints,
    });
  });

  await batch.commit();
}

