import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import type { GameTile, PendingBatch } from "../types";
import {
  isBatchCommand,
  parseBatchCommand,
  checkTileForBatch,
  eliminateTile,
} from "../commands/batchCommand";
import { logBatch, logFlip, screenOf } from "../commands/gameLog";
import CommandBar from "./CommandBar";
import PauseMenu from "./PauseMenu";
import BatchPicker from "./BatchPicker";
import BoardControls from "./BoardControls";

const COLS = 15;
const ROWS = 10;

// How long each tile in a batch waits before the next one flips
const BATCH_REVEAL_MS = 600;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type Props = {
    onExit: () => void;
};

function GameBoard({ onExit }: Props) {
  const total = COLS * ROWS;
  const cells = Array.from({ length: total }, (_, i) => i + 1);

  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [isWinnersGame, setIsWinnersGame] = useState(true);
  const [commandMode, setCommandMode] = useState(false);
  const [command, setCommand] = useState("");
  const [pauseOpen, setPauseOpen] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [batchSizeOpen, setBatchSizeOpen] = useState(false);
  const [batchMenuOpen, setBatchMenuOpen] = useState(false);
  const [batch, setBatch] = useState<PendingBatch | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await invoke<GameTile[]>("get_game_board");
        setTiles(list);
      } catch {
        setTiles([]);
      }
    })();
  }, []);

  // Closes the command bar, discarding whatever was typed and any error on screen
  const closeCommandMode = useCallback(() => {
    setCommandMode(false);
    setCommand("");
    setCommandError(null);
  }, []);

  // Drops a half-built batch, and both of its dialogs with it
  const abandonBatch = useCallback(() => {
    setBatchSizeOpen(false);
    setBatchMenuOpen(false);
    setBatch(null);
    setBatchError(null);
  }, []);

  // Picks made on one screen say nothing about the other, so switching games
  // throws the batch away rather than carrying stale numbers across
  useEffect(() => {
    abandonBatch();
  }, [isWinnersGame, abandonBatch]);

  // Listen for ':' key to enter command mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const batchOpen = batchSizeOpen || batchMenuOpen;
      const busy = pauseOpen || isRevealing || batchOpen || batch !== null;
      // Don't open command mode if any dialogs are open
      if (!busy && !commandMode && e.key === ":") {
        setCommandMode(true);
        e.preventDefault();
      } else if (commandMode && e.key === "Escape") {
        closeCommandMode();
      } else if (!commandMode && !batchOpen && batch !== null && e.key === "Escape") {
        // Only while picking — with a dialog up, Escape belongs to the dialog
        abandonBatch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    commandMode,
    pauseOpen,
    isRevealing,
    batchSizeOpen,
    batchMenuOpen,
    batch,
    closeCommandMode,
    abandonBatch,
  ]);

  const handleCommandChange = (value: string) => {
    setCommand(value);
    if (commandError) setCommandError(null);
  };

  // Handle command submit
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();

    // Command: s to toggle isWinnersGame
    if (trimmed === "s") {
      setIsWinnersGame(prev => !prev);
      closeCommandMode();
      return;
    }

    // Command: b/<batch size>/<n1,n2,...> to eliminate several tiles at once
    if (isBatchCommand(trimmed)) {
      const result = parseBatchCommand(trimmed, { tiles, isWinnersGame, total });
      if ("error" in result) {
        setCommandError(result.error);
        return;
      }
      try {
        await invoke("update_game_tiles", { tiles: result.tiles });
      } catch (err) {
        setCommandError(`Update failed: ${err}`);
        return;
      }
      logBatch(screenOf(isWinnersGame), result.tiles.map(t => t.id));
      closeCommandMode();
      await revealBatch(result.tiles);
      return;
    }

    // Default: just a number toggles eliminated
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 1 && num <= total) {
      const tile = tiles.find(t => t.id === num);
      if (tile) {
        // Prevent editing if in losers game and tile is not eliminated in winners
        if (!isWinnersGame && !tile.isEliminatedInWinners) {
          setCommandError("Not allowed: can only edit eliminated tiles from Winners game");
          return;
        }
        handleTileClick(tile);
        closeCommandMode();
        return;
      }
    }

    setCommandError("Invalid command");
  };

  // The batch is already saved by this point, so this only paces the board:
  // tiles flip one at a time, in the order they were picked, like a live draw
  const revealBatch = async (revealed: GameTile[]) => {
    setIsRevealing(true);
    try {
      for (let i = 0; i < revealed.length; i++) {
        if (i > 0) await sleep(BATCH_REVEAL_MS);
        const tile = revealed[i];
        setTiles(prev => prev.map(t => (t.id === tile.id ? tile : t)));
      }
      const list = await invoke<GameTile[]>("get_game_board");
      setTiles(list);
    } finally {
      setIsRevealing(false);
    }
  };

  const startBatch = (size: number) => {
    setBatchSizeOpen(false);
    setBatch({ size, picked: [] });
    setBatchError(null);
  };

  // A click on the board while a batch is running adds the tile, or takes it
  // back out if it was already picked
  const handleBatchPick = (tile: GameTile, pending: PendingBatch) => {
    setBatchError(null);

    if (pending.picked.includes(tile.id)) {
      setBatch({ ...pending, picked: pending.picked.filter(id => id !== tile.id) });
      return;
    }
    if (pending.picked.length >= pending.size) {
      setBatchError(`Batch already holds ${pending.size} — complete it or drop one first`);
      return;
    }
    const message = checkTileForBatch(tile, isWinnersGame);
    if (message) {
      setBatchError(message);
      return;
    }

    const picked = [...pending.picked, tile.id];
    setBatch({ ...pending, picked });
    // The pick that fills the batch brings the dialog back up on its own, so
    // completing does not cost a trip to the button
    if (picked.length === pending.size) setBatchMenuOpen(true);
  };

  // Writes the finished batch, then hands it to the same paced reveal the
  // typed command uses
  const completeBatch = async () => {
    if (!batch || batch.picked.length !== batch.size) return;

    const picked = batch.picked
      .map(id => tiles.find(t => t.id === id))
      .filter((t): t is GameTile => t !== undefined);
    if (picked.length !== batch.size) {
      setBatchError("Some picked tiles are no longer on the board");
      return;
    }

    const updated = picked.map(t => eliminateTile(t, isWinnersGame));
    try {
      await invoke("update_game_tiles", { tiles: updated });
    } catch (err) {
      setBatchError(`Update failed: ${err}`);
      return;
    }
    logBatch(screenOf(isWinnersGame), batch.picked);

    setBatchMenuOpen(false);
    setBatch(null);
    setBatchError(null);
    await revealBatch(updated);
  };

  const updateTile = async (tile: GameTile | undefined) => {
    if (!tile) return;
    await invoke("update_game_tile", { ...tile });
    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
  };

  const handleTileClick = async (tile: GameTile | undefined) => {
    if (!tile || isRevealing) return;

    // While a batch is being built, clicks pick tiles instead of flipping them
    if (batch) {
      handleBatchPick(tile, batch);
      return;
    }

    switch (isWinnersGame) {
      case true: // Winners
        tile.isEliminatedInWinners = !tile.isEliminatedInWinners;
        break;
      case false: // Losers
        if (!tile.isEliminatedInWinners) return;
        tile.isEliminatedInLosers = !tile.isEliminatedInLosers;
    }
    // Read the side that just moved, so the log says which way the flip went
    const wasEliminated = isWinnersGame ? tile.isEliminatedInWinners : tile.isEliminatedInLosers;
    await updateTile(tile);
    logFlip(screenOf(isWinnersGame), tile.id, wasEliminated);
  };

  const getTileColors = (tile: GameTile | undefined) => {
    if (tile) {
      switch (isWinnersGame) {
        case true: // Winners
          if (tile.isEliminatedInWinners) return { color: "#fff", bgcolor: "#000" };
          return { color: "#fff", bgcolor: "#4caf50" };
        case false: // Losers
          if (tile.isEliminatedInLosers) return { color: "#fff", bgcolor: "#000" };
          if (tile.isEliminatedInWinners) return { color: "gold", bgcolor: "#4caf50" };
          return { color: grey[500], bgcolor: grey[500] };
      }
    };

    return { color: grey[400], bgcolor: "#f7f7f7", };
  }

  // Mid-batch the button reopens the batch dialog, so it only locks while the
  // board is mid-reveal
  const batchButtonDisabled = isRevealing;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#fff",
        position: "relative",
      }}
    >
        <Box
          sx={{
            position: "fixed",
            top: "2.6vw",
            left: "2vw",
            zIndex: 2100,
            fontSize: "3vw",
            color: "#000",
            fontFamily: "Arial Black",
            userSelect: "none",
            pointerEvents: "none",
            lineHeight: 1,
          }}
        >
          {isWinnersGame ? "Reverse Raffle" : "Second Chances"}
        </Box>
      <BoardControls
        batch={batch}
        batchError={batchError}
        batchDisabled={batchButtonDisabled}
        onBatch={() => (batch ? setBatchMenuOpen(true) : setBatchSizeOpen(true))}
        onPause={() => setPauseOpen(true)}
      />
      <BatchPicker
        sizeOpen={batchSizeOpen}
        total={total}
        onStart={startBatch}
        onCancelSize={() => setBatchSizeOpen(false)}
        batch={batch}
        menuOpen={batchMenuOpen}
        error={batchError}
        onKeepPicking={() => setBatchMenuOpen(false)}
        onComplete={completeBatch}
        onAbandon={abandonBatch}
      />
      <PauseMenu
        open={pauseOpen}
        isWinnersGame={isWinnersGame}
        onClose={() => setPauseOpen(false)}
        onSwitchGame={() => setIsWinnersGame(prev => !prev)}
        onExit={onExit}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: "110vw",
          height: "75vh",
          maxWidth: "120vw",
          maxHeight: "100vh",
          border: "2px solid #000",
          backgroundColor: "#fff",
          userSelect: "none",
        }}
      >
        {cells.map((n, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const tile = tiles.find(t => t.id === n);
          const isPicked = batch?.picked.includes(n) ?? false;

          return (
            <Box
              key={n}
              onClick={() => handleTileClick(tile)}
              onContextMenu={e => e.preventDefault()}
              sx={{
                cursor: "pointer",
                borderTop: row === 0 ? "1px solid #000" : 0,
                borderLeft: col === 0 ? "1px solid #000" : 0,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: { xs: 12, sm: 16, md: 18 },
                lineHeight: 1,
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                transition: "background 0.2s",
                ...getTileColors(tile),
                // A picked tile keeps its own colour and just wears a ring until
                // the batch is completed and it actually flips
                boxShadow: isPicked ? "inset 0 0 0 0.3vw #1976d2" : "none",
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "inherit", lineHeight: 1 }}>
                {n}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {commandMode && (
        <CommandBar
          value={command}
          error={commandError}
          onChange={handleCommandChange}
          onSubmit={handleCommandSubmit}
        />
      )}
    </Box>
  );
}

export default GameBoard;
