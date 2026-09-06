export interface GameTile {
  id: number;
  isEliminatedInWinners: boolean;
  isEliminatedInLosers: boolean;
}

// A batch being assembled by clicking, in the order the tiles were picked
export interface PendingBatch {
  size: number;
  picked: number[];
}

// Which board an action happened on
export type GameScreen = "winners" | "losers";

// One recorded action. A flip carries a single number, a batch carries the
// whole list in the order it was picked.
export interface GameLogEntry {
  id: number;
  game: GameScreen;
  kind: "flip" | "batch";
  tiles: string;
  wasEliminated: boolean;
  loggedAt: string;
}
