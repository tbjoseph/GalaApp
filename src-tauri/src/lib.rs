// src/lib.rs
mod file_service;
use file_service::{Db, list_save_files, open_existing_save, open_new_save, list_save_game_names};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        // Optional: while developing, hard-allow your repo `saves` dir:
        // .setup(|app| {
        // #[cfg(debug_assertions)]
        // {
        //     let dev_saves = "/Users/timothyjoseph/Projects/gala-app/saves";
        //     app.fs_scope().allow_directory(dev_saves, true); // recursive
        // }
        // Ok(())
        // })
        .manage(Db::default())
        .invoke_handler(tauri::generate_handler![
            list_save_files,
            open_existing_save,
            open_new_save,
            list_save_game_names,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
