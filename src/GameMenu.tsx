// src/components/GameMenu.tsx
import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import SavePickerDialog from "./SavePickerDialog";
import PromptDialog from "./PromptDialog";


type Props = {
  onReady?: (activeName: string) => void; // called after a save is opened
};

function GameMenu({ onReady }: Props) {
    const [saves, setSaves] = useState<string[]>([]);
    const [selected, setSelected] = useState<string>("");
    const [openSavePicker, setOpenSavePicker] = useState(false);
    const [open, setOpen] = useState(false);
    const [saveName, setSaveName] = useState<string | null>(null);

    const ts = new Date();
    const defaultName
        = ts.getFullYear().toString() + "-"
        + String(ts.getMonth() + 1).padStart(2, "0") + "-"
        + String(ts.getDate()).padStart(2, "0") + "@"
        + String(ts.getHours()).padStart(2, "0") + ":"
        + String(ts.getMinutes()).padStart(2, "0");

    useEffect(() => {
        // prefetch save list for the Load flow
        (async () => {
        try {
            const list = await invoke<string[]>("list_save_files");
            setSaves(list);
        } catch {
            setSaves([]);
        }
        })();
    }, []);

  async function newGame(newGameName: string) {
    // const fn = await invoke("test", { fileName: "myFile" });
    // console.log(fn);
    // return;
    // const name = window.prompt("Name your save file:", `${defaultName}.db`);
    // if (!name) return;

    // const safe = name.replace(/[^\w.-]+/g, "_");
    // await invoke("open_save", { fileName: safe }); // creates/opens AppConfig/saves/<safe>
    // onReady?.(safe);
  }

  async function loadGame() {
    if (!selected) return;
    await invoke("open_save", { fileName: selected });
    onReady?.(selected);
  }

  const [active, setActive] = useState<string | null>(null);

  return (
    <main className="container">
        <h1>Gala Game</h1>

        <div className="row">
            <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <div style={{ display: "grid", gap: 12, width: 280 }}>
                <button
                    onClick={() => setOpen(true)}
                    style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc" }}
                >
                    New Game
                </button>
                <button
                    onClick={() => setOpenSavePicker((v) => !v)}
                    style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #ccc" }}
                >
                    Load Game
                </button>

                {/* {showLoader && (
                    <div style={{ display: "grid", gap: 8 }}>
                    {saves.length ? (
                        <>
                        <select
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                            style={{ padding: "8px", borderRadius: 8, border: "1px solid #ccc" }}
                        >
                            <option value="">Select a save…</option>
                            {saves.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                            ))}
                        </select>
                        <button
                            onClick={loadGame}
                            disabled={!selected}
                            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc" }}
                        >
                            Load Selected
                        </button>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: "#666" }}>
                        No saves found in <code>AppConfig/saves</code>.
                        </div>
                    )}
                    </div>
                )} */}
            </div>
        </div>

        <SavePickerDialog
            open={openSavePicker}
            onClose={() => setOpenSavePicker(false)}
            saves={[]}
            onPick={() => {}}
        />

        <PromptDialog
            open={open}
            title="New Game"
            message="Please enter a title for this game:"
            onClose={() => setOpen(false)}
            onOk={(value) => {
                setSaveName(value);
                setOpen(false);
                newGame(value);
            }}
            defaultValue={defaultName}
        />

    </main>
  );
}

export default GameMenu;