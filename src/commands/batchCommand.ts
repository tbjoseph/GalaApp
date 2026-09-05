import type { GameTile } from "../types";

const USAGE = "Usage: b/<batch size>/<n1,n2,...>";

// The board state the batch rules are checked against
type BoardContext = {
  tiles: GameTile[];
  isWinnersGame: boolean;
  total: number;
};

export type BatchCommandResult = { error: string } | { tiles: GameTile[] };

// Whether a typed command should be handled as a batch at all
export const isBatchCommand = (trimmed: string): boolean =>
  trimmed === "b" || trimmed.startsWith("b/");

// Validates "b/<batch size>/<n1,n2,...>", which only ever moves tiles from
// not-eliminated to eliminated. Returns the tiles to write, or an error message.
export const parseBatchCommand = (
  trimmed: string,
  { tiles, isWinnersGame, total }: BoardContext
): BatchCommandResult => {
  const parts = trimmed.split("/");
  if (parts.length !== 3) return { error: USAGE };

  const sizePart = parts[1].trim();
  const listPart = parts[2].trim();
  if (!/^\d+$/.test(sizePart)) return { error: "Batch size must be a whole number" };

  const size = Number(sizePart);
  if (size < 1) return { error: "Batch size must be at least 1" };
  if (size > total) return { error: `Batch size cannot exceed ${total}` };
  if (listPart === "") return { error: USAGE };

  const entries = listPart.split(",").map(s => s.trim());
  const notNumbers = entries.filter(s => !/^\d+$/.test(s));
  if (notNumbers.length > 0) {
    return { error: `Not a number: ${notNumbers.map(s => (s === "" ? "(blank)" : s)).join(", ")}` };
  }

  const ids = entries.map(Number);
  if (ids.length !== size) {
    return { error: `Batch size is ${size} but ${ids.length} number${ids.length === 1 ? " was" : "s were"} entered` };
  }

  const duplicates = [...new Set(ids.filter((n, i) => ids.indexOf(n) !== i))];
  if (duplicates.length > 0) {
    return { error: `Duplicate number${duplicates.length > 1 ? "s" : ""}: ${duplicates.join(", ")}` };
  }

  const outOfRange = ids.filter(n => n < 1 || n > total);
  if (outOfRange.length > 0) {
    return { error: `Out of range (1-${total}): ${outOfRange.join(", ")}` };
  }

  const missing = ids.filter(n => !tiles.some(t => t.id === n));
  if (missing.length > 0) return { error: `Not on the board: ${missing.join(", ")}` };

  const batch = ids.map(n => tiles.find(t => t.id === n)!);

  // In the losers game a tile can only be edited once it is out of the winners game
  if (!isWinnersGame) {
    const stillIn = batch.filter(t => !t.isEliminatedInWinners);
    if (stillIn.length > 0) {
      return { error: `Not eliminated in Reverse Raffle: ${stillIn.map(t => t.id).join(", ")}` };
    }
  }

  const alreadyEliminated = batch.filter(t =>
    isWinnersGame ? t.isEliminatedInWinners : t.isEliminatedInLosers
  );
  if (alreadyEliminated.length > 0) {
    return { error: `Already eliminated: ${alreadyEliminated.map(t => t.id).join(", ")}` };
  }

  return {
    tiles: batch.map(t => ({
      ...t,
      isEliminatedInWinners: isWinnersGame ? true : t.isEliminatedInWinners,
      isEliminatedInLosers: isWinnersGame ? t.isEliminatedInLosers : true,
    })),
  };
};
