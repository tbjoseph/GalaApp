import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import GameMenu from "./GameMenu";
import GameBoard from "./components/GameBoard";

function App() {
  const [activeSave, setActiveSave] = useState<string | null>(null);

  return (
    <main>
      {activeSave ? (
          <GameBoard onExit={() => setActiveSave(null)} />
        ) : (
          <GameMenu onReady={(name) => setActiveSave(name)} />
        )
      }
    </main>
  );
}

export default App;
