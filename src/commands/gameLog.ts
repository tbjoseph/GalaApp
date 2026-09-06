import { invoke } from "@tauri-apps/api/core";
import type { GameLogEntry, GameScreen } from "../types";

export const screenOf = (isWinnersGame: boolean): GameScreen =>
  isWinnersGame ? "winners" : "losers";

export const screenLabel = (game: GameScreen): string =>
  game === "winners" ? "Reverse Raffle" : "Second Chances";

// The log records what happened, it does not drive the board, so a failed
// write must never interrupt a live draw. Both writers report and move on.
const write = async (
  game: GameScreen,
  kind: "flip" | "batch",
  tiles: string,
  wasEliminated: boolean
): Promise<void> => {
  try {
    await invoke("add_game_log", { game, kind, tiles, wasEliminated });
  } catch (err) {
    console.error(`Failed to log ${kind} (${tiles}) on ${game}:`, err);
  }
};

// A flip can put a number out or bring it back, so it records which way it went
export const logFlip = (game: GameScreen, id: number, wasEliminated: boolean): Promise<void> =>
  write(game, "flip", String(id), wasEliminated);

// One entry for the whole batch, holding the numbers in pick order
export const logBatch = (game: GameScreen, ids: number[]): Promise<void> =>
  write(game, "batch", ids.join(","), true);

export const readGameLog = (game: GameScreen): Promise<GameLogEntry[]> =>
  invoke<GameLogEntry[]>("get_game_log", { game });
