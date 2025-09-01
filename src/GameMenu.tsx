// src/components/GameMenu.tsx
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import SavePickerDialog from "./components/SavePickerDialog";
import PromptDialog from "./components/PromptDialog";

export interface GameSave {
    fileName: string,
    gameName: string,
    createTime: string,
    lastUpdateTime: string,
}

type Props = {
    onReady?: (activeName: string) => void; // called after a save is opened
};

function GameMenu({ onReady }: Props) {
    const [gameSaves, setGameSaves] = useState<GameSave[]>([]);
    // const [selected, setSelected] = useState<string>("");
    const [openSavePicker, setOpenSavePicker] = useState(false);
    const [open, setOpen] = useState(false);
    // const [saveName, setSaveName] = useState<string | null>(null);

    useEffect(() => {
        // prefetch save list for the Load flow
        (async () => {
            try {
                const list = await invoke<GameSave[]>("list_save_games");
                setGameSaves(list);
            } catch {
                setGameSaves([]);
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
        await invoke("open_new_save", { fileName: dbfile, gameName: newGameName }); // creates/opens AppConfig/gameSaves/<safe>
        onReady?.(safe);
    }

    async function loadGame(gameName: string) {
        setOpenSavePicker(false)
        if (!gameName) return;
        await invoke("open_existing_save", { gameName });
        onReady?.(gameName);
    }

    async function deleteGame(fileName: string) {
        if (!fileName) return;
        await invoke("delete_save_file", { fileName });
        const list = await invoke<GameSave[]>("list_save_games");
        setGameSaves(list);
    }

    return (
        <main className="container">
            <h1>Gala Raffle</h1>

            <div className="row">
                <img src="/st_ferdinand.png" className="logo tauri" alt="Tauri logo" />
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
                </div>
            </div>

            {openSavePicker && (
                <SavePickerDialog
                    open={openSavePicker}
                    onClose={() => setOpenSavePicker(false)}
                    gameSaves={gameSaves}
                    onPick={(value) => loadGame(value)}
                    onDelete={(value) => deleteGame(value)}
                />
            )}

            {open && (
                <PromptDialog
                    open={open}
                    title="New Game"
                    message="Please enter a title for this game:"
                    onClose={() => setOpen(false)}
                    onOk={(value) => {
                        setOpen(false);
                        newGame(value);
                    }}
                    onValidate={(value) => {
                        if (gameSaves.map(s => s.gameName).includes(value.trim())) {
                            return false;
                        }
                        return true;
                    }}
                    defaultValue={getDate()}
                />
            )}

        </main>
    );
}

export default GameMenu;