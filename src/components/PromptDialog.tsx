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
    onValidate: (value: string) => boolean;
}

export default function PromptDialog({
    open,
    title = "Prompt",
    message,
    defaultValue = "",
    onClose,
    onOk,
    onValidate,
}: PromptDialogProps) {
    const [value, setValue] = React.useState(defaultValue);
    const [error, setError] = React.useState(false);

    const handleCancel = () => onClose();
    const handleOk = () => onOk(value.trim());

    React.useEffect(() => {
        if (onValidate(value.trim())) {
            setError(false);
        }
        else {
            setError(true);
        }
    }, []);

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
                    error={error}
                    helperText={error ? "A save with this name already exists." : ""}
                    onChange={(e) => {
                        setValue(e.target.value);
                        if (onValidate(e.target.value.trim())) {
                            setError(false);
                        }
                        else {
                            setError(true);
                        }
                    }}

                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel}>Cancel</Button>
                <Button
                    onClick={handleOk}
                    variant="contained"
                    size="small"
                    disabled={error}
                >
                    OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}
