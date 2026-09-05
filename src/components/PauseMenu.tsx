import { useState } from "react";
import { Box, Typography, Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
import { grey } from "@mui/material/colors";

type Props = {
  open: boolean;
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

const cornerButtonSx = {
  position: "absolute",
  top: "1vw",
  minWidth: "2vw",
  minHeight: "2vw",
  width: "2vw",
  height: "2vw",
  borderRadius: "50%",
  fontWeight: 700,
  fontSize: "1.5vw",
  zIndex: 10,
  color: "#222",
  background: "#eee",
  "&:hover": { background: "#ddd" },
  p: 0,
};

// The pause dialog and the command list behind it. Which of the two is showing
// is this component's business, so the board only knows the menu is open.
function PauseMenu({ open, onClose, onSwitchGame, onExit }: Props) {
  const [showCommands, setShowCommands] = useState(false);

  // Leaving the menu always drops back to the pause screen for next time
  const handleClose = () => {
    setShowCommands(false);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && !showCommands}
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
            onClick={() => setShowCommands(true)}
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

      {/* Command List Dialog */}
      <Dialog
        open={open && showCommands}
        onClose={handleClose}
        PaperProps={{
          sx: {
            minWidth: "36vw",
            minHeight: "32vh",
            borderRadius: "1vw",
            p: 0,
            textAlign: "left",
            position: "relative",
            overflow: "visible",
          }
        }}
      >
        {/* Back button */}
        <Button onClick={() => setShowCommands(false)} sx={{ ...cornerButtonSx, left: "1vw" }}>
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
            to build a batch by clicking tiles instead of typing them.
          </Typography>
        </Box>
      </Dialog>
    </>
  );
}

export default PauseMenu;
