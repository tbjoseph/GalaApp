import React from "react";
import { Typography, TextField, Paper } from "@mui/material";

type Props = {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

// The vim-style bar along the bottom of the board. Mounted only while command
// mode is on, so autoFocus lands the caret every time it opens.
function CommandBar({ value, error, onChange, onSubmit }: Props) {
  return (
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
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          alignItems: "center",
          height: "2.5em",
        }}
      >
        <Typography
          component="span"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 18,
            mr: 1,
            display: "flex",
            alignItems: "center",
            height: "100%",
          }}
        >
          :
        </Typography>
        <TextField
          value={value}
          onChange={e => onChange(e.target.value)}
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
            width: 360,
          }}
          autoFocus
        />
        {error && (
          <Typography
            sx={{
              color: "#ff5252",
              fontFamily: "monospace",
              fontSize: 16,
              ml: 2,
              transition: "color 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {error}
          </Typography>
        )}
      </form>
    </Paper>
  );
}

export default CommandBar;
