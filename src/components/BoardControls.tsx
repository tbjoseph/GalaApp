import React from "react";
import { Box, Typography } from "@mui/material";
import type { PendingBatch } from "../types";

type Props = {
  batch: PendingBatch | null;
  batchError: string | null;
  batchDisabled: boolean;
  onBatch: () => void;
  onPause: () => void;
};

const buttonStyle: React.CSSProperties = {
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
  justifyContent: "center",
};

// The fixed cluster in the top right corner of the board: the batch button
// with its progress, and pause.
function BoardControls({ batch, batchError, batchDisabled, onBatch, onPause }: Props) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: "2.5vw",
        right: "2vw",
        zIndex: 2100,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.5vw",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: "1vw" }}>
        {batch && (
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "1.5vw",
              color: "#1976d2",
              userSelect: "none",
            }}
          >
            {batch.picked.length}/{batch.size}
          </Typography>
        )}
        <button
          onClick={onBatch}
          disabled={batchDisabled}
          title={batch ? "Complete or abandon this batch" : "Batch eliminate"}
          style={{
            ...buttonStyle,
            opacity: batchDisabled ? 0.5 : 1,
            cursor: batchDisabled ? "default" : "pointer",
          }}
        >
          <span style={{ fontSize: "1.2vw", lineHeight: 1 }}>▦</span>
        </button>
        <button onClick={onPause} style={buttonStyle}>
          <span style={{ fontSize: "1vw", lineHeight: 1 }}>▐▐</span>
        </button>
      </Box>
      {/* A rejected pick happens with no dialog on screen, so it reports here */}
      {batch && batchError && (
        <Typography
          sx={{
            color: "#d32f2f",
            fontSize: "1vw",
            fontWeight: 600,
            maxWidth: "24vw",
            textAlign: "right",
          }}
        >
          {batchError}
        </Typography>
      )}
    </Box>
  );
}

export default BoardControls;
