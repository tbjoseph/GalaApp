// The round back and close buttons the pause sub-dialogs hang in their top
// corners. Shared so the two of them cannot drift apart.
export const cornerButtonSx = {
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

export const subDialogPaperSx = {
  minWidth: "36vw",
  minHeight: "32vh",
  borderRadius: "1vw",
  p: 0,
  textAlign: "left",
  position: "relative",
  overflow: "visible",
};
