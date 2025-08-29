import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";

const COLS = 15;
const ROWS = 10;
const CELL_W = 52;  // px — tweak if you want larger/smaller cells
const CELL_H = 32;  // px

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
    // prefetch save list for the Load flow
    (async () => {
      try {
        const list = await invoke<GameTile[]>("get_game_board");
        setTiles(list);
      } catch {
        setTiles([]);
      }
    })();

  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",   // vertical center
        justifyContent: "center", // horizontal center
        minHeight: "100vh", // full viewport height
        bgcolor: "#fff",
      }}
    >

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
          gridAutoRows: `${CELL_H}px`,
          width: COLS * CELL_W,
          border: "2px solid #000",
          backgroundColor: "#fff",
          userSelect: "none",
        }}
      >
        {cells.map((n, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          // Find the tile with id === n
          const tile = tiles.find(t => t.id === n);
          const isEliminated = tile?.isEliminatedInWinners;

          return (
            <Box
              key={n}
              sx={{
                borderTop: row === 0 ? "1px solid #000" : 0,
                borderLeft: col === 0 ? "1px solid #000" : 0,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isEliminated ? "#fff" : grey[400],
                bgcolor: isEliminated ? "#000" : "#f7f7f7",
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1 }}>
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