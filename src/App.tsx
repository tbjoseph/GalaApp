import { useState } from "react";
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
