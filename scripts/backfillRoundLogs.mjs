import fs from "node:fs";
import path from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function loadEnvFileIfPresent(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) {
        process.env[key] = value;
      }
    });
  } catch {
    // ignore missing/unreadable file
  }
}

// Load local env so project id can be inferred in developer setups.
loadEnvFileIfPresent(path.join(process.cwd(), ".env.local"));
loadEnvFileIfPresent(path.join(process.cwd(), ".env"));

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  null;

if (!projectId) {
  throw new Error(
    "Missing project id. Set FIREBASE_PROJECT_ID (preferred) or NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local.",
  );
}

// Help google-auth-library / Firestore infer project id consistently.
process.env.GCLOUD_PROJECT ||= projectId;
process.env.GOOGLE_CLOUD_PROJECT ||= projectId;

initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

const PLAYER_ORDER = ["A", "Y", "D", "C"];

function parseArgs(argv) {
  const out = {
    dryRun: false,
    limitGames: null,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    if (arg.startsWith("--limit-games=")) {
      const v = Number.parseInt(arg.split("=")[1] ?? "", 10);
      out.limitGames = Number.isFinite(v) ? v : null;
    }
  }
  return out;
}

function isCompletePointsByPlayer(pointsByPlayer) {
  return PLAYER_ORDER.every((p) => typeof pointsByPlayer[p] === "number");
}

const { dryRun, limitGames } = parseArgs(process.argv.slice(2));

let processedGames = 0;
let processedRounds = 0;
let completedRounds = 0;
let writtenLogs = 0;
let skippedIncompleteRounds = 0;
let roundsWithOnePoint = 0;

let batch = db.batch();
let batchOps = 0;

async function flushBatch() {
  if (batchOps === 0) return;
  if (!dryRun) {
    await batch.commit();
  }
  batch = db.batch();
  batchOps = 0;
}

const gamesQuery = db.collection("games").where("status", "==", "completed");
const gamesSnap = await gamesQuery.get();

for (const gameDoc of gamesSnap.docs) {
  processedGames += 1;
  if (limitGames != null && processedGames > limitGames) break;

  const gameId = gameDoc.id;
  const gameData = gameDoc.data();
  const startedAt = gameData.startedAt ?? null; // Firestore Timestamp
  const endedAt = gameData.endedAt ?? null; // Firestore Timestamp
  const gameDate = endedAt ?? startedAt ?? null;

  const roundsSnap = await gameDoc.ref.collection("rounds").get();

  for (const roundDoc of roundsSnap.docs) {
    processedRounds += 1;

    const roundId = roundDoc.id; // "01", "02", ...
    const roundData = roundDoc.data();
    const roundNumber = roundData.roundNumber ?? null;

    const scoresSnap = await roundDoc.ref.collection("scores").get();
    if (scoresSnap.size !== PLAYER_ORDER.length) {
      skippedIncompleteRounds += 1;
      continue;
    }

    const pointsByPlayer = { A: null, Y: null, D: null, C: null };
    for (const s of scoresSnap.docs) {
      const d = s.data();
      if (d?.playerId && typeof d.points === "number") {
        pointsByPlayer[d.playerId] = d.points;
      }
    }

    if (!isCompletePointsByPlayer(pointsByPlayer)) {
      skippedIncompleteRounds += 1;
      continue;
    }

    completedRounds += 1;
    if (PLAYER_ORDER.some((p) => pointsByPlayer[p] === 1)) {
      roundsWithOnePoint += 1;
    }

    const totalRoundPoints =
      pointsByPlayer.A + pointsByPlayer.Y + pointsByPlayer.D + pointsByPlayer.C;

    const logRef = db.collection("roundLogs").doc(`${gameId}_${roundId}`);
    batch.set(
      logRef,
      {
        gameId,
        roundId,
        roundNumber,
        pointsByPlayer,
        totalRoundPoints,
        gameStartedAt: startedAt,
        gameEndedAt: endedAt,
        gameDate,
        source: "backfill",
        loggedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    batchOps += 1;
    writtenLogs += 1;

    // Firestore batch limit is 500; stay well below.
    if (batchOps >= 400) {
      await flushBatch();
    }
  }
}

await flushBatch();

console.log(
  JSON.stringify(
    {
      dryRun,
      processedGames,
      processedRounds,
      completedRounds,
      skippedIncompleteRounds,
      writtenLogs,
      roundsWithOnePoint,
    },
    null,
    2,
  ),
);


