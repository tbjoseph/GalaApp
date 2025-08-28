import * as React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack } from '@mui/material';

function SavePickerDialog({ open, onClose, saves, onPick }: {
  open: boolean;
  onClose: () => void;
  saves: string[];
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
          {saves.length === 0 ? 'No saves found.' :
            saves.map(name => (
              <Button
                key={name}
                variant="outlined"
                onClick={() => onPick(name)}
                sx={{ justifyContent: 'flex-start', textTransform: "none" }}
              >
                {name}
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