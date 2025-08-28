import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import GameMenu from "./GameMenu";
import MatchResultsGrid from "./components/MatchResultsGrid";

function App() {
  const [activeSave, setActiveSave] = useState<string | null>(null);

  return (
    <main>
      {activeSave ? (
          <MatchResultsGrid />
        ) : (
          <GameMenu onReady={(name) => setActiveSave(name)} />
        )
      }
    </main>
  );
}

export default App;
