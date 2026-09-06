// src/log_service.rs
use crate::file_service::Db;
use sqlx::{FromRow, SqlitePool};
use tauri::State;

#[derive(Debug, FromRow, serde::Serialize, serde::Deserialize)]
pub struct GameLogEntry {
    pub id: i64,

    // Which board the action happened on: 'winners' or 'losers'
    pub game: String,

    // 'flip' for a single number, 'batch' for several at once
    pub kind: String,

    // The number, or the batch in the order it was picked
    pub tiles: String,

    // A flip can put a number out or bring it back. Batches only ever
    // eliminate, so they are always true.
    #[sqlx(rename = "wasEliminated")]
    #[serde(rename = "wasEliminated")]
    pub was_eliminated: bool,

    #[sqlx(rename = "loggedAt")]
    #[serde(rename = "loggedAt")]
    pub logged_at: String,
}

// Saves written before the log existed have no GameLog table, and there is no
// migration runner, so every path that opens a save calls this.
pub async fn ensure_game_log_table(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query(
        r#"
        -- TEXT, not STRING: SQLite does not know the name STRING, so such a
        -- column takes NUMERIC affinity and quietly stores the tiles of a
        -- one-number flip as an integer, which then fails to decode as a String.
        CREATE TABLE IF NOT EXISTS GameLog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game TEXT NOT NULL,
            kind TEXT NOT NULL,
            tiles TEXT NOT NULL,
            wasEliminated BOOLEAN NOT NULL,
            loggedAt TEXT NOT NULL
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_game_log(
    state: State<'_, Db>,
    game: String,
    kind: String,
    tiles: String,
    was_eliminated: bool,
) -> Result<(), String> {
    let pool = state.lock().read().await.as_ref().cloned().ok_or("No DB open")?;
    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO GameLog (game, kind, tiles, wasEliminated, loggedAt)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&game)
    .bind(&kind)
    .bind(&tiles)
    .bind(was_eliminated)
    .bind(&now)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_game_log(
    state: State<'_, Db>,
    game: String,
) -> Result<Vec<GameLogEntry>, String> {
    let pool = state.lock().read().await.as_ref().cloned().ok_or("No DB open")?;

    let results = sqlx::query_as::<_, GameLogEntry>(
        r#"
        SELECT id, game, kind, tiles, wasEliminated, loggedAt
        FROM GameLog
        WHERE game = ?
        ORDER BY id DESC
        "#,
    )
    .bind(&game)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(results)
}
