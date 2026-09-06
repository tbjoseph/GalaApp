import { useEffect, useState } from "react";
import { Box, Typography, Dialog, Button } from "@mui/material";
import { grey } from "@mui/material/colors";
import type { GameLogEntry } from "../types";
import { readGameLog, screenLabel, screenOf } from "../commands/gameLog";
import { cornerButtonSx, subDialogPaperSx } from "./dialogChrome";

type Props = {
  open: boolean;
  isWinnersGame: boolean;
  onBack: () => void;
  onClose: () => void;
};

const timeOf = (loggedAt: string): string => {
  const at = new Date(loggedAt);
  return isNaN(at.getTime()) ? loggedAt : at.toLocaleTimeString();
};

// What the entry says in the list. A batch keeps its numbers in pick order.
const describe = (entry: GameLogEntry): string => {
  if (entry.kind === "batch") {
    const numbers = entry.tiles.split(",");
    return `Batch of ${numbers.length} — ${numbers.join(", ")}`;
  }
  return `${entry.tiles} ${entry.wasEliminated ? "eliminated" : "brought back"}`;
};

// The running record for whichever screen is showing. Each board keeps its own
// log, so this only ever asks for one of them.
function GameLogDialog({ open, isWinnersGame, onBack, onClose }: Props) {
  const game = screenOf(isWinnersGame);
  const [entries, setEntries] = useState<GameLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read on open rather than holding a copy, so the list is current every time
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await readGameLog(game);
        if (!cancelled) setEntries(rows);
      } catch (err) {
        if (!cancelled) setError(`Could not read the log: ${err}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, game]);

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: subDialogPaperSx }}>
      <Button onClick={onBack} sx={{ ...cornerButtonSx, left: "1vw" }}>
        ←
      </Button>
      <Button onClick={onClose} sx={{ ...cornerButtonSx, right: "1vw" }}>
        ×
      </Button>
      <Box sx={{ p: "2.5vw 2vw 2vw 2vw", pt: "4vw" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: "1.7vw" }}>
          {screenLabel(game)} Log
        </Typography>

        {loading && <Typography sx={{ fontSize: "1.1vw", color: grey[600] }}>Reading…</Typography>}

        {error && <Typography sx={{ fontSize: "1.1vw", color: "#d32f2f" }}>{error}</Typography>}

        {!loading && !error && entries.length === 0 && (
          <Typography sx={{ fontSize: "1.1vw", color: grey[600] }}>
            Nothing has happened on this screen yet.
          </Typography>
        )}

        {!loading && !error && entries.length > 0 && (
          <Box sx={{ maxHeight: "40vh", overflowY: "auto", pr: "0.5vw" }}>
            {entries.map(entry => (
              <Box
                key={entry.id}
                sx={{
                  display: "flex",
                  gap: "1vw",
                  py: "0.5vw",
                  borderBottom: `1px solid ${grey[200]}`,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontSize: "1vw",
                    color: grey[600],
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeOf(entry.loggedAt)}
                </Typography>
                <Typography sx={{ fontSize: "1.1vw" }}>{describe(entry)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

export default GameLogDialog;
