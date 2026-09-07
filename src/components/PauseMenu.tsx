import { useState } from "react";
import { Box, Typography, Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
import { grey } from "@mui/material/colors";
import GameLogDialog from "./GameLogDialog";
import { cornerButtonSx, subDialogPaperSx } from "./dialogChrome";

type Props = {
  open: boolean;
  isWinnersGame: boolean;
  onClose: () => void;
  onSwitchGame: () => void;
  onExit: () => void;
};

const menuButtonSx = {
  fontSize: "1.2vw",
  borderRadius: "0.7vw",
  px: "2vw",
  py: "0.7vw",
};

// Which of the pause screens is showing. All three are opened by the pause
// dialog's own buttons and closed together, so this stays internal state.
type View = "menu" | "commands" | "log";

// The pause dialog and the screens behind it. Which one is showing is this
// component's business, so the board only knows the menu is open.
function PauseMenu({ open, isWinnersGame, onClose, onSwitchGame, onExit }: Props) {
  const [view, setView] = useState<View>("menu");

  // Leaving the menu always drops back to the pause screen for next time
  const handleClose = () => {
    setView("menu");
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && view === "menu"}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: "30vw",
            minHeight: "20vh",
            borderRadius: "1vw",
            p: 2,
            textAlign: "center"
          }
        }}
      >
        <DialogTitle sx={{ fontSize: "2vw", fontWeight: 700 }}>Paused</DialogTitle>
        <DialogActions
          disableSpacing
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            gap: 2,
            pb: 2,
            pt: 1,
          }}
        >
          <Button onClick={handleClose} variant="contained" sx={menuButtonSx}>
            Resume
          </Button>
          <Button onClick={onSwitchGame} variant="contained" color="secondary" sx={menuButtonSx}>
            Switch Game Screen
          </Button>
          <Button
            onClick={() => setView("log")}
            variant="contained"
            color="info"
            sx={menuButtonSx}
          >
            Game Log
          </Button>
          <Button
            onClick={() => setView("commands")}
            variant="contained"
            color="info"
            sx={menuButtonSx}
          >
            Command List
          </Button>
          <Button onClick={onExit} variant="outlined" color="error" sx={menuButtonSx}>
            Exit Game
          </Button>
        </DialogActions>
      </Dialog>

      <GameLogDialog
        open={open && view === "log"}
        isWinnersGame={isWinnersGame}
        onBack={() => setView("menu")}
        onClose={handleClose}
      />

      {/* Command List Dialog */}
      <Dialog
        open={open && view === "commands"}
        onClose={handleClose}
        PaperProps={{ sx: subDialogPaperSx }}
      >
        {/* Back button */}
        <Button onClick={() => setView("menu")} sx={{ ...cornerButtonSx, left: "1vw" }}>
          ←
        </Button>
        {/* X button */}
        <Button onClick={handleClose} sx={{ ...cornerButtonSx, right: "1vw" }}>
          ×
        </Button>
        <Box sx={{ p: "2.5vw 2vw 2vw 2vw", pt: "4vw" }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, fontSize: "1.7vw" }}>
            Command Mode
          </Typography>
          <Typography sx={{ mb: 2, fontSize: "1.1vw" }}>
            Press <b>:</b> to enter command mode. Type a command and press <b>Enter</b>.
          </Typography>
          <Typography sx={{ mb: 1, fontWeight: 600, fontSize: "1.2vw" }}>
            Available Commands:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2, fontSize: "1.1vw" }}>
            <li>
              <b>&lt;number&gt;</b> — Toggle <i>eliminated</i> for that tile (e.g. <b>25</b>)
            </li>
            <li>
              <b>b/&lt;batch size&gt;/&lt;numbers&gt;</b> — Eliminate several tiles at once
              (e.g. <b>b/4/1,2,3,5</b>). The count must match the batch size and none of
              the tiles may already be eliminated. They flip one at a time, in the
              order entered.
            </li>
            <li>
              <b>s</b> — Switch between Winners and Losers game screens
            </li>
            <li>
              <b>Esc</b> — Exit command mode
            </li>
          </Box>
          <Typography sx={{ fontSize: "1vw", color: grey[600] }}>
            You can also left-click a tile to toggle eliminated, or use the <b>▦</b> button
            to build a batch by clicking tiles instead of typing them. Every flip and batch
            is recorded in the game log. Numbers that were not sold are greyed out: they
            cannot be flipped or batched, and are left out of the ticket count.
          </Typography>
        </Box>
      </Dialog>
    </>
  );
}

export default PauseMenu;
