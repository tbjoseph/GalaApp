// src/file_service.rs
use std::{fs, path::{Path, PathBuf}, sync::Arc};
use sqlx::{sqlite::{SqliteConnectOptions, SqlitePoolOptions}, SqlitePool};
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

// Ensure the file name ends with `.db` (case-insensitive), reject paths with separators.
fn normalize_save_name(raw: &str) -> Result<String, String> {
  if raw.contains('/') || raw.contains('\\') {
    return Err("file_name must be a bare file name (no path separators)".into());
  }
  let has_ext = Path::new(raw)
    .extension()
    .and_then(|e| e.to_str())
    .map(|e| e.eq_ignore_ascii_case("db"))
    .unwrap_or(false);
  Ok(if has_ext { raw.to_string() } else { format!("{raw}.db") })
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
pub async fn open_new_save(app: tauri::AppHandle, state: tauri::State<'_, Db>, file_name: String, game_name: String) -> Result<(), String> {
  let mut file_name = normalize_save_name(&file_name)?;
  let existing_files = list_save_files(app.clone()).await?;

  if existing_files.contains(&file_name) {
    // Try file_name_copy.db, file_name_copy2.db, etc.
    let (base, ext) = match file_name.rsplit_once('.') {
      Some((b, e)) => (b.to_string(), e.to_string()),
      None => (file_name.clone(), String::new()),
    };
    let mut i = 1;
    loop {
      let candidate = if ext.is_empty() {
        format!("{base}_copy{i}")
      } else {
        format!("{base}_copy{i}.{ext}")
      };
      if !existing_files.contains(&candidate) {
        file_name = candidate;
        break;
      }
      i += 1;
    }
  }

  let path = saves_dir(&app)?.join(&file_name);

  // Build options that CREATE the DB file if missing
  let opts = SqliteConnectOptions::new()
    .filename(&path)                    // <- no "sqlite://" needed
    .create_if_missing(true)
    // .journal_mode(SqliteJournalMode::Wal)
    // .foreign_keys(true)
    ;

  let pool: SqlitePool = SqlitePoolOptions::new()
    .max_connections(5)
    .connect_with(opts)
    .await
    .map_err(|e| e.to_string())?;

  // let pool = SqlitePool::connect(&url).await.map_err(|e| e.to_string())?;
  // schema / migrations:
  sqlx::query(r#"
    CREATE TABLE MatchResults (
        id INT PRIMARY KEY CHECK (id BETWEEN 1 AND 150),
        isEliminatedInWinners BOOLEAN NOT NULL,
        isEliminatedInLosers BOOLEAN NOT NULL,
        isWinnerInWinners BOOLEAN NOT NULL,
        isWinnerInLosers BOOLEAN NOT NULL
    );

    WITH RECURSIVE nums(id) AS (
      SELECT 1
      UNION ALL
      SELECT id + 1 FROM nums WHERE id < 150
    )
    INSERT INTO MatchResults (
      id, isEliminatedInWinners, isEliminatedInLosers, isWinnerInWinners, isWinnerInLosers
    )
    SELECT id, 0, 0, 0, 0
    FROM nums;

    CREATE TABLE Config (
        key STRING NOT NULL,
        value STRING NOT NULL
    );
  "#)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

  let config_key = "game_name";
  let config_value = game_name; // assuming game_name is a String
  sqlx::query("INSERT INTO Config (key, value) VALUES (?, ?)")
    .bind(config_key)
    .bind(&config_value)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

  *state.0.write().await = Some(pool);
  Ok(())
}

#[tauri::command]
pub async fn open_existing_save(
  app: tauri::AppHandle,
  state: tauri::State<'_, Db>,
  file_name: String,
) -> Result<(), String> {
  let path = saves_dir(&app)?.join(&file_name);

  // Fail if it doesn't exist (and ensure it's a file)
  if !path.exists() || !path.is_file() {
    return Err(format!("Save not found: {}", file_name));
  }

  let opts = SqliteConnectOptions::new()
    .filename(&path)
    .create_if_missing(false)              // <- enforce "existing only"
    // .journal_mode(SqliteJournalMode::Wal)  // optional but recommended
    // .foreign_keys(true)
    ;

  let pool: SqlitePool = SqlitePoolOptions::new()
    .max_connections(5)
    .connect_with(opts)
    .await
    .map_err(|e| e.to_string())?;

  *state.0.write().await = Some(pool);
  Ok(())
}

#[tauri::command]
pub async fn list_save_game_names(app: tauri::AppHandle) -> Result<Vec<(String, String)>, String> {
    let save_files = list_save_files(app.clone()).await?;
    let mut game_names = Vec::new();

    for file_name in save_files {
        let path = saves_dir(&app)?.join(&file_name);
        let opts = SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(false);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .map_err(|e| format!("Failed to open {}: {}", file_name, e))?;

        let row: Option<(String,)> = sqlx::query_as("SELECT value FROM Config WHERE key = 'game_name' LIMIT 1")
            .fetch_optional(&pool)
            .await
            .map_err(|e| format!("Failed to query {}: {}", file_name, e))?;

        if let Some((game_name,)) = row {
            game_names.push((file_name, game_name));
        } else {
            game_names.push((file_name, String::from("<unknown>")));
        }
    }

    Ok(game_names)
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
