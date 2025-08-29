import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography } from "@mui/material";
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

  const handleTileClick = async (tile: GameTile | undefined) => {
    if (!tile) return;
    const updated = !tile.isEliminatedInWinners;
    await invoke("update_game_tile", {
      id: tile.id,
      isEliminatedInWinners: updated,
      isEliminatedInLosers: tile.isEliminatedInLosers,
      isWinnerInWinners: tile.isWinnerInWinners,
      isWinnerInLosers: tile.isWinnerInLosers,
    });
    // Refresh tiles after update
    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: "110vw",
          height: "80vh",
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
              sx={{
                cursor: "pointer",
                // Draw only needed sides so interior lines are single-pixel
                borderTop: row === 0 ? "1px solid #000" : 0,
                borderLeft: col === 0 ? "1px solid #000" : 0,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEliminated ? "#fff" : grey[400],
                bgcolor: isEliminated ? "#000" : "#f7f7f7",
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
    </Box>
  );
}

export default GameBoard;