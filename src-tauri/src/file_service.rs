// src/file_service.rs
use std::{fs, path::PathBuf, sync::Arc};
use sqlx::SqlitePool;
use tauri::Manager;
use tokio::sync::RwLock;

#[derive(Default)]
pub struct Db(pub Arc<RwLock<Option<SqlitePool>>>);

fn saves_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
  let saves = dir.join("saves");
  fs::create_dir_all(&saves).map_err(|e| e.to_string())?;
  Ok(saves)
}

#[tauri::command]
pub async fn list_save_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  let saves = saves_dir(&app)?;
  let mut out = Vec::new();
  for entry in fs::read_dir(saves).map_err(|e| e.to_string())? {
    let e = entry.map_err(|e| e.to_string())?;
    if e.file_type().map_err(|e| e.to_string())?.is_file() {
      if let Some(name) = e.file_name().to_str() {
        if name.to_lowercase().ends_with(".db") {
          out.push(name.to_string());
        }
      }
    }
  }
  Ok(out)
}

#[tauri::command]
pub async fn open_save(app: tauri::AppHandle, state: tauri::State<'_, Db>, file_name: String) -> Result<(), String> {
  let path = saves_dir(&app)?.join(file_name);
  let url = format!("sqlite://{}", path.to_string_lossy());
  let pool = SqlitePool::connect(&url).await.map_err(|e| e.to_string())?;
  // schema / migrations:
  sqlx::query(r#"
    CREATE TABLE IF NOT EXISTS todos(
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
  "#).execute(&pool).await.map_err(|e| e.to_string())?;
  *state.0.write().await = Some(pool);
  Ok(())
}

#[tauri::command]
pub async fn test(app: tauri::AppHandle, state: tauri::State<'_, Db>, file_name: String) -> Result<String, String> {
  let path = saves_dir(&app)?.join(file_name);
  let url = format!("sqlite://{}", path.to_string_lossy());
  // let pool = SqlitePool::connect(&url).await.map_err(|e| e.to_string())?;
  // // schema / migrations:
  // sqlx::query(r#"
  //   CREATE TABLE IF NOT EXISTS todos(
  //     id INTEGER PRIMARY KEY,
  //     title TEXT NOT NULL,
  //     done INTEGER NOT NULL DEFAULT 0
  //   );
  // "#).execute(&pool).await.map_err(|e| e.to_string())?;
  // *state.0.write().await = Some(pool);
  Ok(url)
}

// #[derive(serde::Serialize)]
// struct Todo { id: i64, title: String, done: bool }

// #[tauri::command]
// async fn add_todo(state: tauri::State<'_, Db>, title: String) -> Result<i64, String> {
//   let pool = state.0.read().await.as_ref().cloned().ok_or("No DB open")?;
//   let res = sqlx::query("INSERT INTO todos (title, done) VALUES (?, 0)")
//     .bind(title)
//     .execute(&pool).await.map_err(|e| e.to_string())?;
//   Ok(res.last_insert_rowid())
// }

// #[tauri::command]
// async fn list_todos(state: tauri::State<'_, Db>) -> Result<Vec<Todo>, String> {
//   let pool = state.0.read().await.as_ref().cloned().ok_or("No DB open")?;
//   let rows = sqlx::query!(r#"SELECT id, title, done as "done: bool" FROM todos ORDER BY id DESC"#)
//     .fetch_all(&pool).await.map_err(|e| e.to_string())?;
//   Ok(rows.into_iter().map(|r| Todo { id: r.id, title: r.title, done: r.done }).collect())
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//   tauri::Builder::default()
//     .manage(Db::default())
//     .invoke_handler(tauri::generate_handler![
//       list_save_files, open_save, add_todo, list_todos
//     ])
//     .run(tauri::generate_context!())
//     .expect("error while running tauri application");
// }
