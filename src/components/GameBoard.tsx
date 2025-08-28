import * as React from "react";
import { Box, Typography } from "@mui/material";
import { grey } from "@mui/material/colors";

const COLS = 15;
const ROWS = 10;
const CELL_W = 52;  // px — tweak if you want larger/smaller cells
const CELL_H = 32;  // px

function GameBoard() {
  const total = COLS * ROWS;
  const cells = Array.from({ length: total }, (_, i) => i + 1);

  return (
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
        return (
          <Box
            key={n}
            sx={{
              // draw only needed sides so interior lines are single-pixel
              borderTop: row === 0 ? "1px solid #000" : 0,
              borderLeft: col === 0 ? "1px solid #000" : 0,
              borderRight: "1px solid #000",
              borderBottom: "1px solid #000",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              // light, slightly muted number style
              color: grey[400],
              bgcolor: "#f7f7f7",
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1 }}>
              {n}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default GameBoard;