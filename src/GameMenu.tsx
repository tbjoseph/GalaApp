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

    const getDate = () => {
        const ts = new Date();
        return ts.getFullYear().toString() + "-"
            + String(ts.getMonth() + 1).padStart(2, "0") + "-"
            + String(ts.getDate()).padStart(2, "0") + "@"
            + String(ts.getHours()).padStart(2, "0") + ":"
            + String(ts.getMinutes()).padStart(2, "0");
    }

    async function newGame(newGameName: string) {
        // const fn = await invoke("test", { fileName: "myFile" });
        // console.log(fn);
        // return;
        // const name = window.prompt("Name your save file:", `${defaultName}.db`);
        // if (!name) return;

        const safe = newGameName.replace(/[^\w.-]+/g, "_");
        const dbfile = safe.toLowerCase().endsWith(".db") ? safe : `${safe}.db`;
        await invoke("open_new_save", { fileName: dbfile, gameName: newGameName }); // creates/opens AppConfig/saves/<safe>
        onReady?.(safe);
    }

    async function loadGame(gameName: string) {
        if (!gameName) return;
        await invoke("open_existing_save", { fileName: gameName });
        onReady?.(gameName);
    }

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

            {openSavePicker && (
                <SavePickerDialog
                    open={openSavePicker}
                    onClose={() => setOpenSavePicker(false)}
                    saves={saves}
                    onPick={() => loadGame}
                />
            )}

            {open && (
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
                    defaultValue={getDate()}
                />
            )}

        </main>
    );
}

export default GameMenu;