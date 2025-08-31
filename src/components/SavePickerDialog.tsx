import * as React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Stack, Tooltip, Typography
} from '@mui/material';
import { GameSave } from '../GameMenu';

function SavePickerDialog({ open, onClose, gameSaves, onPick, onDelete }: {
  open: boolean;
  onClose: () => void;
  gameSaves: GameSave[];
  onPick: (name: string) => void;
  onDelete?: (fileName: string) => void;
}) {
  const [toDelete, setToDelete] = React.useState<GameSave | null>(null);

  const handleConfirmDelete = () => {
    if (toDelete && onDelete) onDelete(toDelete.fileName);
    setToDelete(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: { sx: { borderRadius: 2, p: 1, minWidth: 500 } },
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
                  <Stack
                    key={save.gameName}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <Button
                      variant="outlined"
                      onClick={() => onPick(save.gameName)}
                      sx={{ justifyContent: "space-between", textTransform: "none", flex: 1 }}
                    >
                      <span>{save.gameName}</span>
                      <span style={{ fontStyle: "italic", color: "grey" }}>
                        {new Date(save.lastUpdateTime).toLocaleString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </Button>

                    {onDelete && (
                      <Tooltip title="Delete save">
                        <span
                          onClick={() => setToDelete(save)}
                          style={{
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            userSelect: "none",
                          }}
                        >
                          ❌
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                ))
            }
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog */}
      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
      >
        <DialogTitle>Delete save?</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Are you sure you want to delete <strong>{toDelete?.gameName}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default SavePickerDialog;
