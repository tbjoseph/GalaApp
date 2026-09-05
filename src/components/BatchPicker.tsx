import React, { useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import type { PendingBatch } from "../types";
import { validateBatchSize } from "../commands/batchCommand";

type Props = {
  // Phase one: asking how many tiles the batch holds
  sizeOpen: boolean;
  total: number;
  onStart: (size: number) => void;
  onCancelSize: () => void;
  // Phase two: the running batch. Its dialog is opened from the batch button,
  // so the board is clear for picking the rest of the time.
  batch: PendingBatch | null;
  menuOpen: boolean;
  error: string | null;
  onKeepPicking: () => void;
  onComplete: () => void;
  onAbandon: () => void;
};

const dialogPaperSx = { borderRadius: "1vw", p: 1, minWidth: "24vw" };

// Click-driven batching: one dialog to set the size, and one to finish or drop
// the batch once tiles are being picked off the board.
function BatchPicker({
  sizeOpen,
  total,
  onStart,
  onCancelSize,
  batch,
  menuOpen,
  error,
  onKeepPicking,
  onComplete,
  onAbandon,
}: Props) {
  const [size, setSize] = useState("");
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleSizeChange = (value: string) => {
    setSize(value);
    if (sizeError) setSizeError(null);
  };

  const handleCancelSize = () => {
    setSize("");
    setSizeError(null);
    onCancelSize();
  };

  const handleSubmitSize = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = size.trim();
    const message = validateBatchSize(trimmed, total);
    if (message) {
      setSizeError(message);
      return;
    }
    setSize("");
    setSizeError(null);
    onStart(Number(trimmed));
  };

  const remaining = batch ? batch.size - batch.picked.length : 0;

  return (
    <>
      <Dialog open={sizeOpen} onClose={handleCancelSize} PaperProps={{ sx: dialogPaperSx }}>
        <form onSubmit={handleSubmitSize}>
          <DialogTitle sx={{ fontSize: "1.6vw", fontWeight: 700 }}>New Batch</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 1, fontSize: "1vw", color: grey[700] }}>
              How many tiles are in this batch? Pick them on the board afterwards.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              variant="outlined"
              label="Batch size"
              value={size}
              error={sizeError !== null}
              helperText={sizeError ?? " "}
              onChange={e => handleSizeChange(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelSize}>Cancel</Button>
            <Button type="submit" variant="contained">
              Start
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={menuOpen && batch !== null}
        onClose={onKeepPicking}
        PaperProps={{ sx: dialogPaperSx }}
      >
        {batch && (
          <>
            <DialogTitle sx={{ fontSize: "1.6vw", fontWeight: 700 }}>
              Batch {batch.picked.length}/{batch.size}
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ mb: 1, fontSize: "1vw", color: grey[700] }}>
                {remaining === 0
                  ? "All tiles picked — complete the batch to flip them."
                  : `Click tiles on the board to pick them. ${remaining} to go.`}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.4vw", minHeight: "1.8vw" }}>
                {batch.picked.length === 0 ? (
                  <Typography sx={{ fontSize: "1vw", color: grey[500], fontStyle: "italic" }}>
                    No tiles picked yet.
                  </Typography>
                ) : (
                  batch.picked.map(id => (
                    <Box
                      key={id}
                      sx={{
                        px: "0.6vw",
                        py: "0.2vw",
                        borderRadius: "0.4vw",
                        bgcolor: "#1976d2",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1vw",
                      }}
                    >
                      {id}
                    </Box>
                  ))
                )}
              </Box>
              {error && (
                <Typography sx={{ color: "#d32f2f", fontSize: "1vw", mt: 1 }}>{error}</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={onAbandon} color="error">
                Abandon
              </Button>
              <Button onClick={onKeepPicking}>Keep Picking</Button>
              <Button onClick={onComplete} variant="contained" disabled={remaining !== 0}>
                Complete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}

export default BatchPicker;
