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
import { BOARD_COLS, BOARD_TOTAL } from "../board";
import { formatUnsoldList, parseUnsoldList } from "../commands/unsoldNumbers";

interface UnsoldNumbersDialogProps {
    open: boolean;
    // The numbers already marked, which this dialog edits a copy of
    unsold: number[];
    onCancel: () => void;
    onSave: (unsold: number[]) => void;
}

// Marks the tickets that never sold, either typed as a list — "3, 7, 20-35" —
// or clicked on a small copy of the board, whichever is quicker for the way
// they came in. Edits a draft, so leaving by Cancel changes nothing.
export default function UnsoldNumbersDialog({
    open,
    unsold: initialUnsold,
    onCancel,
    onSave,
}: UnsoldNumbersDialogProps) {
    const [unsold, setUnsold] = React.useState<number[]>(initialUnsold);
    const [text, setText] = React.useState(formatUnsoldList(initialUnsold));
    const [error, setError] = React.useState<string | null>(null);

    // Typing is the source of truth while the field has focus: the list is only
    // rewritten from the picks, never from a half-typed entry
    const handleTextChange = (next: string) => {
        setText(next);
        const result = parseUnsoldList(next, BOARD_TOTAL);
        if ("error" in result) {
            setError(result.error);
            return;
        }
        setError(null);
        setUnsold(result.ids);
    };

    const toggleNumber = (n: number) => {
        const next = unsold.includes(n)
            ? unsold.filter(id => id !== n)
            : [...unsold, n].sort((a, b) => a - b);
        setUnsold(next);
        setText(formatUnsoldList(next));
        setError(null);
    };

    const handleClear = () => {
        setUnsold([]);
        setText("");
        setError(null);
    };

    const sold = BOARD_TOTAL - unsold.length;

    return (
        <Dialog
            open={open}
            onClose={onCancel}
            slotProps={{
                paper: {
                    sx: { borderRadius: 2, p: 1, minWidth: 620 }
                },
            }}
        >
            <DialogTitle>Unsold Numbers</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    Numbers that were not sold — type them as a list, or click them below.
                    They stay greyed out on the board and are not counted as tickets.
                </Typography>

                <TextField
                    autoFocus
                    size="small"
                    fullWidth
                    variant="outlined"
                    placeholder="e.g. 3, 7, 20-35"
                    label="Unsold numbers"
                    value={text}
                    error={error !== null}
                    helperText={error ?? " "}
                    onChange={(e) => handleTextChange(e.target.value)}
                />

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
                        gap: "2px",
                        mt: 1,
                        userSelect: "none",
                    }}
                >
                    {Array.from({ length: BOARD_TOTAL }, (_, i) => i + 1).map(n => {
                        const picked = unsold.includes(n);
                        return (
                            <Box
                                key={n}
                                onClick={() => toggleNumber(n)}
                                sx={{
                                    cursor: "pointer",
                                    aspectRatio: "1",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "3px",
                                    border: `1px solid ${grey[400]}`,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    transition: "background 0.15s",
                                    bgcolor: picked ? grey[300] : "#4caf50",
                                    color: picked ? grey[500] : "#fff",
                                    "&:hover": { opacity: 0.8 },
                                }}
                            >
                                {n}
                            </Box>
                        );
                    })}
                </Box>

                <Typography sx={{ mt: 1, fontSize: 13, color: grey[700] }}>
                    {sold} of {BOARD_TOTAL} tickets in play
                    {unsold.length > 0 ? ` — ${unsold.length} not sold` : ""}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClear} disabled={unsold.length === 0}>
                    Clear
                </Button>
                <Button onClick={onCancel}>Cancel</Button>
                <Button
                    onClick={() => onSave(unsold)}
                    variant="contained"
                    size="small"
                    disabled={error !== null}
                >
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
}
