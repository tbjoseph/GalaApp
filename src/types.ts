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
