import * as React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Box,
} from "@mui/material";
import { grey } from "@mui/material/colors";
import { BOARD_TOTAL } from "../board";
import { formatUnsoldList } from "../commands/unsoldNumbers";
import UnsoldNumbersDialog from "./UnsoldNumbersDialog";

interface NewGameDialogProps {
    open: boolean;
    defaultValue?: string;
    onClose: () => void;
    onOk: (name: string, unsold: number[]) => void;
    onValidate: (value: string) => boolean;
}

// Names the game, and holds the unsold numbers its own dialog collects. Most
// games sell out, so that dialog stays behind a button rather than on screen.
export default function NewGameDialog({
    open,
    defaultValue = "",
    onClose,
    onOk,
    onValidate,
}: NewGameDialogProps) {
    const [value, setValue] = React.useState(defaultValue);
    const [nameError, setNameError] = React.useState(false);
    const [unsold, setUnsold] = React.useState<number[]>([]);
    const [unsoldOpen, setUnsoldOpen] = React.useState(false);

    React.useEffect(() => {
        setNameError(!onValidate(value.trim()));
    }, []);

    const handleNameChange = (next: string) => {
        setValue(next);
        setNameError(!onValidate(next.trim()));
    };

    const handleCancel = () => onClose();
    const handleOk = () => onOk(value.trim(), unsold);

    return (
        <>
            <Dialog
                open={open}
                onClose={handleCancel}
                slotProps={{
                    paper: {
                        sx: { borderRadius: 2, p: 1, minWidth: 500 }
                    },
                }}
            >
                <DialogTitle>New Game</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        Please enter a title for this game:
                    </Typography>

                    <TextField
                        autoFocus
                        size="small"
                        fullWidth
                        variant="outlined"
                        value={value}
                        error={nameError}
                        helperText={nameError ? "A save with this name already exists." : ""}
                        onChange={(e) => handleNameChange(e.target.value)}
                    />

                    <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
                        <Button variant="outlined" onClick={() => setUnsoldOpen(true)}>
                            Add Unsold Tickets
                        </Button>
                        {/* noWrap: a long list is truncated rather than allowed
                            to grow the dialog. The grid behind the button is
                            where the whole picture lives. */}
                        <Typography noWrap sx={{ fontSize: 13, color: grey[700], minWidth: 0 }}>
                            {unsold.length === 0
                                ? `All ${BOARD_TOTAL} tickets in play`
                                : `${BOARD_TOTAL - unsold.length} of ${BOARD_TOTAL} in play — not sold: ${formatUnsoldList(unsold)}`}
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel}>Cancel</Button>
                    <Button
                        onClick={handleOk}
                        variant="contained"
                        size="small"
                        disabled={nameError}
                    >
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Mounted only while open, so it always opens on a fresh draft of
                whatever is currently marked */}
            {unsoldOpen && (
                <UnsoldNumbersDialog
                    open={unsoldOpen}
                    unsold={unsold}
                    onCancel={() => setUnsoldOpen(false)}
                    onSave={(next) => {
                        setUnsold(next);
                        setUnsoldOpen(false);
                    }}
                />
            )}
        </>
    );
}
