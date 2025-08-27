import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

interface PromptDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  defaultValue?: string;
  onClose: () => void;
  onOk: (value: string) => void;
}

export default function PromptDialog({
  open,
  title = "Prompt",
  message,
  defaultValue = "",
  onClose,
  onOk,
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue);

  const handleCancel = () => onClose();
  const handleOk = () => onOk(value);

  return (
    <Dialog
        open={open}
        onClose={handleCancel}
        slotProps={{
            paper: {
                sx: { borderRadius: 2, p: 1, minWidth: 500 }
            },
        }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && <p>{message}</p>}
        <TextField
            autoFocus
            size="small"
            fullWidth
            variant="outlined"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            defaultValue
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleOk} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
