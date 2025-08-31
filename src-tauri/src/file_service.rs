// src/file_service.rs
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    SqlitePool,
    FromRow,
};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};
use tauri::Manager;
use tokio::sync::RwLock;

#[derive(Default)]
pub struct Db(pub Arc<RwLock<Option<SqlitePool>>>);

#[derive(Debug, FromRow, serde::Serialize)]
pub struct GameSave {
    #[sqlx(rename = "fileName")]
    #[serde(rename = "fileName")]
    file_name: String,

    #[sqlx(rename = "gameName")]
    #[serde(rename = "gameName")]
    game_name: String,

    #[sqlx(rename = "createTime")]
    #[serde(rename = "createTime")]
    create_time: String,

    #[sqlx(rename = "lastUpdateTime")]
    #[serde(rename = "lastUpdateTime")]
    last_update_time: String,
}

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
    Ok(if has_ext {
        raw.to_string()
    } else {
        format!("{raw}.db")
    })
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
pub async fn open_new_save(
    app: tauri::AppHandle,
    state: tauri::State<'_, Db>,
    file_name: String,
    game_name: String,
) -> Result<(), String> {
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
    sqlx::query(
        r#"
    CREATE TABLE GameBoard (
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
    INSERT INTO GameBoard (
      id, isEliminatedInWinners, isEliminatedInLosers, isWinnerInWinners, isWinnerInLosers
    )
    SELECT id, 0, 0, 0, 0
    FROM nums;

    CREATE TABLE Config (
        key STRING NOT NULL,
        value STRING NOT NULL
    );
  "#,
    )
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    // Insert config values for gameName, CreateTime, and LastUpdateTime
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO Config (key, value) VALUES (?, ?), (?, ?), (?, ?)")
        .bind("gameName")
        .bind(&game_name)
        .bind("CreateTime")
        .bind(&now)
        .bind("LastUpdateTime")
        .bind(&now)
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
    game_name: String,
) -> Result<(), String> {
    // Find the file_name for the given game_name
    let save_files = list_save_files(app.clone()).await?;
    let mut file_name: Option<String> = None;

    for candidate in save_files {
        let path = saves_dir(&app)?.join(&candidate);
        let opts = SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(false);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(opts)
            .await
            .map_err(|e| format!("Failed to open {}: {}", candidate, e))?;

        let row: Option<(String,)> =
            sqlx::query_as("SELECT value FROM Config WHERE key = 'gameName' LIMIT 1")
                .fetch_optional(&pool)
                .await
                .map_err(|e| format!("Failed to query {}: {}", candidate, e))?;

        if let Some((db_game_name,)) = row {
            if db_game_name == game_name {
                file_name = Some(candidate);
                break;
            }
        }
    }

    let file_name = file_name.ok_or_else(|| format!("No save found for game: {}", game_name))?;
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
pub async fn list_save_games(app: tauri::AppHandle) -> Result<Vec<GameSave>, String> {
    let save_files = list_save_files(app.clone()).await?;
    let mut game_infos = Vec::new();

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

        let rows: Option<GameSave> = sqlx::query_as::<_, GameSave>(
            r#"
            SELECT
                ?1 AS fileName,
                (SELECT value FROM Config WHERE key = 'gameName'        LIMIT 1) AS gameName,
                (SELECT value FROM Config WHERE key = 'CreateTime'      LIMIT 1) AS createTime,
                (SELECT value FROM Config WHERE key = 'LastUpdateTime'  LIMIT 1) AS lastUpdateTime
            "#
        )
        .bind(&file_name)   // inject the file name you already have
        .fetch_optional(&pool)
        .await
        .map_err(|e| format!("Failed to query {}: {}", file_name, e))?;

        if let Some(gs) = rows {
            game_infos.push(gs);
        } else {
            game_infos.push(GameSave {
                file_name,
                game_name: "<unknown>".into(),
                create_time: String::new(),
                last_update_time: String::new(),
            });
        }
    }

    Ok(game_infos)
}
