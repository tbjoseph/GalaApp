import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack } from '@mui/material';
import { GameSave } from '../GameMenu';

function SavePickerDialog({ open, onClose, gameSaves, onPick }: {
  open: boolean;
  onClose: () => void;
  gameSaves: GameSave[];
  onPick: (name: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: 1, minWidth: 500 }
        },
      }}
    >
      <DialogTitle>Load Game</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {gameSaves.length === 0 ? 'No saves found.' :
            gameSaves
              .sort((a, b) =>
                new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
              )
              .map(save => (
                <Button
                  key={save.gameName}
                  variant="outlined"
                  onClick={() => onPick(save.gameName)}
                  sx={{
                    justifyContent: "space-between",
                    textTransform: "none",
                  }}
                >
                  <span>{save.gameName}</span>
                  <span
                    style={{
                      fontStyle: "italic",
                      color: "grey"
                    }}
                  >
                    {new Date(save.lastUpdateTime).toLocaleString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </Button>
              ))
          }
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default SavePickerDialog;