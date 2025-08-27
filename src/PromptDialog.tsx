import * as React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
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
    const handleOk = () => onOk(value.trim());

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
                {message && (
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        {message}
                    </Typography>
                )}

                <TextField
                    autoFocus
                    size="small"
                    fullWidth
                    variant="outlined"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button
                    onClick={handleOk}
                    variant="contained"
                    size="small"
                    disabled={value.trim() === ""} // disable until input is non-empty
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
