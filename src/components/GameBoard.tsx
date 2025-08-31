import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography, TextField, Paper } from "@mui/material";
import { grey } from "@mui/material/colors";

const COLS = 15;
const ROWS = 10;

interface GameTile {
  id: number;
  isEliminatedInWinners: boolean;
  isEliminatedInLosers: boolean;
  isWinnerInWinners: boolean;
  isWinnerInLosers: boolean;
}

function GameBoard() {
  const total = COLS * ROWS;
  const cells = Array.from({ length: total }, (_, i) => i + 1);

  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [commandMode, setCommandMode] = useState(false);
  const [command, setCommand] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);

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

  // Listen for ':' key to enter command mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!commandMode && e.key === ":") {
        setCommandMode(true);
        setTimeout(() => commandInputRef.current?.focus(), 0);
        e.preventDefault();
      } else if (commandMode && e.key === "Escape") {
        setCommandMode(false);
        setCommand("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandMode]);

  // Handle command submit
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();
    // Only allow numbers for toggling
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 1 && num <= total) {
      const tile = tiles.find(t => t.id === num);
      if (tile) {
        handleTileClick(tile)
      }
    }
    setCommandMode(false);
    setCommand("");
  };

  const updateTile = async (tile: GameTile | undefined) => {
    if (!tile) return;
    await invoke("update_game_tile", { ...tile });
    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
  };

  const handleTileClick = async (tile: GameTile | undefined) => {
    if (!tile) return;
    tile.isEliminatedInWinners = !tile.isEliminatedInWinners;
    tile.isWinnerInWinners = false;
    updateTile(tile);
  };

  const handleTileRightClick = async (
    e: React.MouseEvent,
    tile: GameTile | undefined
  ) => {
    e.preventDefault();
    if (!tile) return;
    tile.isEliminatedInWinners = false;
    tile.isWinnerInWinners = !tile.isWinnerInWinners;
    updateTile(tile);
  };

  const getTileColor = (tile: GameTile) => {
    if (tile.isWinnerInWinners) return "#4caf50"; // Green for winner
    if (tile.isEliminatedInWinners) return "#000"; // Red for eliminated f44336
    return "#f7f7f7"; // Default
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
          const isEliminated = tile?.isEliminatedInWinners;

          return (
            <Box
              key={n}
              onClick={() => handleTileClick(tile)}
              onContextMenu={e => handleTileRightClick(e, tile)}
              sx={{
                cursor: "pointer",
                borderTop: row === 0 ? "1px solid #000" : 0,
                borderLeft: col === 0 ? "1px solid #000" : 0,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEliminated ? "#fff" : grey[400],
                bgcolor: tile ? getTileColor(tile) : "#f7f7f7",
                fontWeight: 600,
                fontSize: { xs: 12, sm: 16, md: 18 },
                lineHeight: 1,
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                transition: "background 0.2s",
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
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            left: 0,
            bottom: 0,
            width: "100vw",
            bgcolor: "#222",
            color: "#fff",
            p: 1,
            zIndex: 2000,
            borderRadius: 0,
          }}
        >
          <form onSubmit={handleCommandSubmit}>
            <Typography
              component="span"
              sx={{ fontFamily: "monospace", fontWeight: 700, mr: 1 }}
            >
              :
            </Typography>
            <TextField
              inputRef={commandInputRef}
              value={command}
              onChange={e => setCommand(e.target.value)}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                style: {
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: 18,
                  background: "transparent",
                },
              }}
              sx={{
                width: 120,
              }}
              autoFocus
            />
          </form>
        </Paper>
      )}
    </Box>
  );
}

export default GameBoard;