import React, { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";
import type { GameTile } from "../types";
import { isBatchCommand, parseBatchCommand } from "../commands/batchCommand";
import CommandBar from "./CommandBar";
import PauseMenu from "./PauseMenu";

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

  // Listen for ':' key to enter command mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't open command mode if any dialogs are open
      if (!(pauseOpen || isRevealing) && !commandMode && e.key === ":") {
        setCommandMode(true);
        e.preventDefault();
      } else if (commandMode && e.key === "Escape") {
        closeCommandMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandMode, pauseOpen, isRevealing, closeCommandMode]);

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
  // tiles flip one at a time, in the order they were typed, like a live draw
  const revealBatch = async (batch: GameTile[]) => {
    setIsRevealing(true);
    try {
      for (let i = 0; i < batch.length; i++) {
        if (i > 0) await sleep(BATCH_REVEAL_MS);
        const tile = batch[i];
        setTiles(prev => prev.map(t => (t.id === tile.id ? tile : t)));
      }
      const list = await invoke<GameTile[]>("get_game_board");
      setTiles(list);
    } finally {
      setIsRevealing(false);
    }
  };

  const updateTile = async (tile: GameTile | undefined) => {
    if (!tile) return;
    await invoke("update_game_tile", { ...tile });
    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
  };

  const handleTileClick = async (tile: GameTile | undefined) => {
    if (!tile || isRevealing) return;

    switch (isWinnersGame) {
      case true: // Winners
        tile.isEliminatedInWinners = !tile.isEliminatedInWinners;
        break;
      case false: // Losers
        if (!tile.isEliminatedInWinners) return;
        tile.isEliminatedInLosers = !tile.isEliminatedInLosers;
    }
    updateTile(tile);
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
      <Box
        sx={{
          position: "fixed",
          top: "2.5vw",
          right: "2vw",
          zIndex: 2100,
        }}
      >
        <button
          onClick={() => setPauseOpen(true)}
          style={{
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "1vw",
            padding: "0.5vw 1vw",
            fontWeight: 700,
            fontSize: "1.5vw",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            minWidth: "3vw",
            minHeight: "3vw",
            display: "flex",
            alignItems: "center",
            gap: "0.5vw"
          }}
        >
          <span style={{ fontSize: "1vw", lineHeight: 1, marginRight: "0.5vw" }}>▐▐</span>
        </button>
      </Box>
      <PauseMenu
        open={pauseOpen}
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