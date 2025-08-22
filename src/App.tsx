import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
// src/lib/saves.ts
import { readDir } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import * as path from '@tauri-apps/api/path';

async function pickSavesDir(): Promise<string | null> {
  // Native directory picker (adds selected path to FS scope for this run)
  const selection = await open({ directory: true, multiple: false });
  if (!selection || Array.isArray(selection)) return null;
  return selection; // absolute path string
}

async function listDbFiles(dir: string) {
  const entries = await readDir(dir);           // absolute OK if in scope
  const result: { name: string; full: string }[] = [];
  for (const e of entries) {
    if (!e.isDirectory && e.name?.toLowerCase().endsWith('.db')) {
      result.push({ name: e.name!, full: await path.join(dir, e.name!) });
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}


function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
