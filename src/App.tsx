import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import GameMenu from "./GameMenu";

function App() {
  const [activeSave, setActiveSave] = useState<string | null>(null);

  return (
    <main className="container">
      <h1>Gala Game</h1>

      <div className="row">
        <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        {activeSave ? (
            // <GameScreen activeSave={activeSave} />
            <GameMenu onReady={(name) => setActiveSave(name)} />
          ) : (
            <GameMenu onReady={(name) => setActiveSave(name)} />
          )
        }
      </div>
    </main>
  );
}

export default App;
