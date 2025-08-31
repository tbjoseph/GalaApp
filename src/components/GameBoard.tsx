import React, { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Box, Typography, TextField, Paper, Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
import { grey } from "@mui/material/colors";

const COLS = 15;
const ROWS = 10;

interface GameTile {
  id: number;
  isEliminatedInWinners: boolean;
  isEliminatedInLosers: boolean;
  isWinnerInWinners: boolean;
  isWinnerInLosers: boolean;
}

type Props = {
    onExit: () => void;
};

function GameBoard({ onExit }: Props) {
  const total = COLS * ROWS;
  const cells = Array.from({ length: total }, (_, i) => i + 1);

  const [tiles, setTiles] = useState<GameTile[]>([]);
  const [isWinnersGame, setIsWinnersGame] = useState(true);
  const [commandMode, setCommandMode] = useState(false);
  const [command, setCommand] = useState("");
  const [pauseOpen, setPauseOpen] = useState(false);
  const [showCommandList, setShowCommandList] = useState(false);
  const [invalidCommand, setInvalidCommand] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await invoke<GameTile[]>("get_game_board");
        setTiles(list);
      } catch {
        setTiles([]);
      }
    })();
  }, []);

  // Listen for ':' key to enter command mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't open command mode if any dialogs are open
      if (!(pauseOpen || showCommandList) && !commandMode && e.key === ":") {
        setCommandMode(true);
        setTimeout(() => commandInputRef.current?.focus(), 0);
        e.preventDefault();
      } else if (commandMode && e.key === "Escape") {
        setCommandMode(false);
        setCommand("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandMode, pauseOpen, showCommandList]);

  // Handle command submit
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();

    // Command: s to toggle isWinnersGame
    if (trimmed === "s") {
      setIsWinnersGame(prev => !prev);
      setCommandMode(false);
      setCommand("");
      setInvalidCommand(false);
      return;
    }

    // Command: w/{number} to mark as winner
    const winnerMatch = trimmed.match(/^w\/(\d+)$/i);
    if (winnerMatch) {
      const num = Number(winnerMatch[1]);
      if (!isNaN(num) && num >= 1 && num <= total) {
        const tile = tiles.find(t => t.id === num);
        if (tile) {
          tile.isEliminatedInWinners = false;
          tile.isWinnerInWinners = true;
          updateTile(tile);
          setCommandMode(false);
          setCommand("");
          setInvalidCommand(false);
          return;
        }
      }
      setInvalidCommand(true);
      return;
    }

    // Default: just a number toggles eliminated
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 1 && num <= total) {
      const tile = tiles.find(t => t.id === num);
      if (tile) {
        handleTileClick(tile);
        setCommandMode(false);
        setCommand("");
        setInvalidCommand(false);
        return;
      }
    }

    // Invalid command
    setInvalidCommand(true);
  };

  const updateTile = async (tile: GameTile | undefined) => {
    if (!tile) return;
    await invoke("update_game_tile", { ...tile });
    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
  };

  const handleTileClick = async (tile: GameTile | undefined) => {
    if (!tile) return;

    switch (isWinnersGame) {
      case true: // Winners
        tile.isEliminatedInWinners = !tile.isEliminatedInWinners;
        tile.isWinnerInWinners = false;
        break;
      case false: // Losers
        if (tile.isEliminatedInWinners || tile.isWinnerInWinners) return;
        tile.isEliminatedInLosers = !tile.isEliminatedInLosers;
        tile.isWinnerInLosers = false;
    }
    updateTile(tile);
  };

  const handleTileRightClick = async (
    e: React.MouseEvent,
    tile: GameTile | undefined
  ) => {
    e.preventDefault();
    if (!tile) return;

    switch (isWinnersGame) {
      case true: // Winners
        tile.isEliminatedInWinners = false;
        tile.isWinnerInWinners = !tile.isWinnerInWinners;
        break;
      case false: // Losers
        if (tile.isEliminatedInWinners || tile.isWinnerInWinners) return;
        tile.isEliminatedInLosers = false;
        tile.isWinnerInLosers = !tile.isWinnerInLosers;
    }
    updateTile(tile);
  };

  const getTileColors = (tile: GameTile | undefined) => {
    if (tile) {
      switch (isWinnersGame) {
        case true: // Winners
          if (tile.isWinnerInWinners) return { color: "#f44336", bgcolor: "#4caf50" };
          if (tile.isEliminatedInWinners) return { color: "#fff", bgcolor: "#000" };
          break;
        case false: // Losers
          if (tile.isWinnerInWinners) return { color: "#f44336", bgcolor: "#4caf50" };
          if (tile.isWinnerInLosers) return { color: "#4caf50", bgcolor: "yellow" };
          if (tile.isEliminatedInWinners) return { color: grey[600], bgcolor: grey[600] };
          if (tile.isEliminatedInLosers) return { color: "#fff", bgcolor: "#000" };
          break;
      }
    };

    return { color: grey[400], bgcolor: "#f7f7f7", };
  }

  // Handler to close all dialogs
  const handleCloseAllDialogs = () => {
    setPauseOpen(false);
    setShowCommandList(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#fff",
        position: "relative",
      }}
    >
      {isWinnersGame && (
        <Box
          sx={{
            position: "fixed",
            top: "1vw",
            left: "2vw",
            zIndex: 2100,
            fontSize: "6vw",
            color: "#000",
            fontFamily: "serif",
            userSelect: "none",
            pointerEvents: "none",
            lineHeight: 1,
          }}
        >
          ♕
        </Box>
      )}
      <Box
        sx={{
          position: "fixed",
          top: "2.5vw",
          right: "2vw",
          zIndex: 2100,
        }}
      >
        <button
          onClick={() => setPauseOpen(true)}
          style={{
            background: "#222",
            color: "#fff",
            border: "none",
            borderRadius: "1vw",
            padding: "0.5vw 1vw",
            fontWeight: 700,
            fontSize: "1.5vw",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            minWidth: "3vw",
            minHeight: "3vw",
            display: "flex",
            alignItems: "center",
            gap: "0.5vw"
          }}
        >
          <span style={{ fontSize: "1vw", lineHeight: 1, marginRight: "0.5vw" }}>▐▐</span>
        </button>
      </Box>
      <Dialog
        open={pauseOpen && !showCommandList}
        onClose={() => setPauseOpen(false)}
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
          <Button
            onClick={() => setPauseOpen(false)}
            variant="contained"
            sx={{
              fontSize: "1.2vw",
              borderRadius: "0.7vw",
              px: "2vw",
              py: "0.7vw"
            }}
          >
            Resume
          </Button>
          <Button
            onClick={() => setIsWinnersGame(prev => !prev)}
            variant="contained"
            color="secondary"
            sx={{
              fontSize: "1.2vw",
              borderRadius: "0.7vw",
              px: "2vw",
              py: "0.7vw"
            }}
          >
            Switch Game Screen
          </Button>
          <Button
            onClick={() => setShowCommandList(true)}
            variant="contained"
            color="info"
            sx={{
              fontSize: "1.2vw",
              borderRadius: "0.7vw",
              px: "2vw",
              py: "0.7vw"
            }}
          >
            Command List
          </Button>
          <Button
            onClick={onExit}
            variant="outlined"
            color="error"
            sx={{
              fontSize: "1.2vw",
              borderRadius: "0.7vw",
              px: "2vw",
              py: "0.7vw"
            }}
          >
            Exit Game
          </Button>
        </DialogActions>
      </Dialog>

      {/* Command List Dialog */}
      <Dialog
        open={showCommandList}
        onClose={handleCloseAllDialogs}
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
        <Button
          onClick={() => setShowCommandList(false)}
          sx={{
            position: "absolute",
            top: "1vw",
            left: "1vw",
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
          }}
        >
          ←
        </Button>
        {/* X button */}
        <Button
          onClick={handleCloseAllDialogs}
          sx={{
            position: "absolute",
            top: "1vw",
            right: "1vw",
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
          }}
        >
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
              <b>w/&lt;number&gt;</b> — Mark tile as <i>winner</i> (e.g. <b>w/25</b>)
            </li>
            <li>
              <b>s</b> — Switch between Winners and Losers game screens
            </li>
            <li>
              <b>Esc</b> — Exit command mode
            </li>
          </Box>
          <Typography sx={{ fontSize: "1vw", color: grey[600] }}>
            You can also right-click a tile to mark as winner, or left-click to toggle eliminated.
          </Typography>
        </Box>
      </Dialog>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          width: "110vw",
          height: "75vh",
          maxWidth: "120vw",
          maxHeight: "100vh",
          border: "2px solid #000",
          backgroundColor: "#fff",
          userSelect: "none",
        }}
      >
        {cells.map((n, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const tile = tiles.find(t => t.id === n);

          return (
            <Box
              key={n}
              onClick={() => handleTileClick(tile)}
              onContextMenu={e => handleTileRightClick(e, tile)}
              sx={{
                cursor: "pointer",
                borderTop: row === 0 ? "1px solid #000" : 0,
                borderLeft: col === 0 ? "1px solid #000" : 0,
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: { xs: 12, sm: 16, md: 18 },
                lineHeight: 1,
                width: "100%",
                height: "100%",
                boxSizing: "border-box",
                transition: "background 0.2s",
                ...getTileColors(tile),
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "inherit", lineHeight: 1 }}>
                {n}
              </Typography>
            </Box>
          );
        })}
      </Box>
      {commandMode && (
        <Paper
          elevation={3}
          sx={{
            position: "fixed",
            left: 0,
            bottom: 0,
            width: "100vw",
            bgcolor: "#222",
            color: "#fff",
            p: 1,
            zIndex: 2000,
            borderRadius: 0,
          }}
        >
          <form
            onSubmit={handleCommandSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              height: "2.5em",
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 18,
                mr: 1,
                display: "flex",
                alignItems: "center",
                height: "100%",
              }}
            >
              :
            </Typography>
            <TextField
              inputRef={commandInputRef}
              value={command}
              onChange={e => {
                setCommand(e.target.value);
                if (invalidCommand) setInvalidCommand(false);
              }}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                style: {
                  color: "#fff",
                  fontFamily: "monospace",
                  fontSize: 18,
                  background: "transparent",
                },
              }}
              sx={{
                width: 120,
              }}
              autoFocus
            />
            {invalidCommand && (
              <Typography
                sx={{
                  color: "#ff5252",
                  fontFamily: "monospace",
                  fontSize: 16,
                  ml: 2,
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                Invalid command
              </Typography>
            )}
          </form>
        </Paper>
      )}
    </Box>
  );
}

export default GameBoard;