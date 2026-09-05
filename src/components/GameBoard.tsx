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
  const [losersEditError, setLosersEditError] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
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
      setBatchError(null);
      return;
    }

    // Command: b/<batch size>/<n1,n2,...> to eliminate several tiles at once
    if (trimmed === "b" || trimmed.startsWith("b/")) {
      const error = await runBatchCommand(trimmed);
      setInvalidCommand(false);
      setLosersEditError(false);
      if (error) {
        setBatchError(error);
        return;
      }
      setCommandMode(false);
      setCommand("");
      setBatchError(null);
      return;
    }

    // Default: just a number toggles eliminated
    const num = Number(trimmed);
    if (!isNaN(num) && num >= 1 && num <= total) {
      const tile = tiles.find(t => t.id === num);
      if (tile) {
        // Prevent editing if in losers game and tile is not eliminated in winners
        if (!isWinnersGame && !tile.isEliminatedInWinners) {
          setLosersEditError(true);
          setInvalidCommand(false);
          setBatchError(null);
          return;
        }
        handleTileClick(tile);
        setCommandMode(false);
        setCommand("");
        setInvalidCommand(false);
        setBatchError(null);
        return;
      }
    }

    // Invalid command
    setInvalidCommand(true);
    setBatchError(null);
  };

  // Parses and applies "b/<batch size>/<n1,n2,...>", which only ever moves tiles
  // from not-eliminated to eliminated. Returns an error message, or null on success.
  const runBatchCommand = async (trimmed: string): Promise<string | null> => {
    const usage = "Usage: b/<batch size>/<n1,n2,...>";
    const parts = trimmed.split("/");
    if (parts.length !== 3) return usage;

    const sizePart = parts[1].trim();
    const listPart = parts[2].trim();
    if (!/^\d+$/.test(sizePart)) return "Batch size must be a whole number";

    const size = Number(sizePart);
    if (size < 1) return "Batch size must be at least 1";
    if (size > total) return `Batch size cannot exceed ${total}`;
    if (listPart === "") return usage;

    const entries = listPart.split(",").map(s => s.trim());
    const notNumbers = entries.filter(s => !/^\d+$/.test(s));
    if (notNumbers.length > 0) {
      return `Not a number: ${notNumbers.map(s => (s === "" ? "(blank)" : s)).join(", ")}`;
    }

    const ids = entries.map(Number);
    if (ids.length !== size) {
      return `Batch size is ${size} but ${ids.length} number${ids.length === 1 ? " was" : "s were"} entered`;
    }

    const duplicates = [...new Set(ids.filter((n, i) => ids.indexOf(n) !== i))];
    if (duplicates.length > 0) {
      return `Duplicate number${duplicates.length > 1 ? "s" : ""}: ${duplicates.join(", ")}`;
    }

    const outOfRange = ids.filter(n => n < 1 || n > total);
    if (outOfRange.length > 0) {
      return `Out of range (1-${total}): ${outOfRange.join(", ")}`;
    }

    const missing = ids.filter(n => !tiles.some(t => t.id === n));
    if (missing.length > 0) return `Not on the board: ${missing.join(", ")}`;

    const batch = ids.map(n => tiles.find(t => t.id === n)!);

    // In the losers game a tile can only be edited once it is out of the winners game
    if (!isWinnersGame) {
      const stillIn = batch.filter(t => !t.isEliminatedInWinners);
      if (stillIn.length > 0) {
        return `Not eliminated in Reverse Raffle: ${stillIn.map(t => t.id).join(", ")}`;
      }
    }

    const alreadyEliminated = batch.filter(t =>
      isWinnersGame ? t.isEliminatedInWinners : t.isEliminatedInLosers
    );
    if (alreadyEliminated.length > 0) {
      return `Already eliminated: ${alreadyEliminated.map(t => t.id).join(", ")}`;
    }

    const updated = batch.map(t => ({
      ...t,
      isEliminatedInWinners: isWinnersGame ? true : t.isEliminatedInWinners,
      isEliminatedInLosers: isWinnersGame ? t.isEliminatedInLosers : true,
    }));

    try {
      await invoke("update_game_tiles", { tiles: updated });
    } catch (e) {
      return `Update failed: ${e}`;
    }

    const list = await invoke<GameTile[]>("get_game_board");
    setTiles(list);
    return null;
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
        break;
      case false: // Losers
        if (!tile.isEliminatedInWinners) return;
        tile.isEliminatedInLosers = !tile.isEliminatedInLosers;
    }
    updateTile(tile);
  };

  const getTileColors = (tile: GameTile | undefined) => {
    if (tile) {
      switch (isWinnersGame) {
        case true: // Winners
          if (tile.isEliminatedInWinners) return { color: "#fff", bgcolor: "#000" };
          return { color: "#fff", bgcolor: "#4caf50" };
        case false: // Losers
          if (tile.isEliminatedInLosers) return { color: "#fff", bgcolor: "#000" };
          if (tile.isEliminatedInWinners) return { color: "gold", bgcolor: "#4caf50" };
          return { color: grey[500], bgcolor: grey[500] };
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
        <Box
          sx={{
            position: "fixed",
            top: "2.6vw",
            left: "2vw",
            zIndex: 2100,
            fontSize: "3vw",
            color: "#000",
            fontFamily: "Arial Black",
            userSelect: "none",
            pointerEvents: "none",
            lineHeight: 1,
          }}
        >
          {isWinnersGame ? "Reverse Raffle" : "Second Chances"}
        </Box>
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
              <b>b/&lt;batch size&gt;/&lt;numbers&gt;</b> — Eliminate several tiles at once
              (e.g. <b>b/4/1,2,3,5</b>). The count must match the batch size and none of
              the tiles may already be eliminated.
            </li>
            <li>
              <b>s</b> — Switch between Winners and Losers game screens
            </li>
            <li>
              <b>Esc</b> — Exit command mode
            </li>
          </Box>
          <Typography sx={{ fontSize: "1vw", color: grey[600] }}>
            You can also left-click a tile to toggle eliminated.
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
              onContextMenu={e => e.preventDefault()}
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
                if (losersEditError) setLosersEditError(false);
                if (batchError) setBatchError(null);
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
                width: 360,
              }}
              autoFocus
            />
            {batchError && (
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
                {batchError}
              </Typography>
            )}
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
            {losersEditError && (
              <Typography
                sx={{
                  color: "#ffb300",
                  fontFamily: "monospace",
                  fontSize: 16,
                  ml: 2,
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                Not allowed: can only edit eliminated tiles from Winners game
              </Typography>
            )}
          </form>
        </Paper>
      )}
    </Box>
  );
}

export default GameBoard;