use crate::file_service::Db;
use sqlx::{FromRow, Row, SqlitePool};
use tauri::State;

#[derive(Debug, FromRow, serde::Serialize, serde::Deserialize)]
pub struct GameTile {
    pub id: i64,

    #[sqlx(rename = "isEliminatedInWinners")]
    #[serde(rename = "isEliminatedInWinners")]
    pub is_eliminated_in_winners: bool,

    #[sqlx(rename = "isEliminatedInLosers")]
    #[serde(rename = "isEliminatedInLosers")]
    pub is_eliminated_in_losers: bool,

    // A ticket that was never sold. Set once when the save is created, and
    // never written again, so the update commands leave it alone.
    #[sqlx(rename = "isUnsold")]
    #[serde(rename = "isUnsold")]
    pub is_unsold: bool,
}

// Saves written before unsold numbers existed have no isUnsold column, and
// there is no migration runner, so every path that opens a save calls this.
pub async fn ensure_unsold_column(pool: &SqlitePool) -> Result<(), String> {
    let columns = sqlx::query("PRAGMA table_info(GameBoard)")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let has_column = columns
        .iter()
        .any(|row| row.get::<String, _>("name") == "isUnsold");
    if has_column {
        return Ok(());
    }

    sqlx::query("ALTER TABLE GameBoard ADD COLUMN isUnsold BOOLEAN NOT NULL DEFAULT 0")
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_game_board(
    state: State<'_, Db>,
) -> Result<Vec<GameTile>, String> {
    let pool = state.lock().read().await.as_ref().cloned().ok_or("No DB open")?;
    let results = sqlx::query_as::<_, GameTile>(
        r#"
        SELECT id, isEliminatedInWinners, isEliminatedInLosers, isUnsold
        FROM GameBoard
        ORDER BY id
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn update_game_tile(
    state: State<'_, Db>,
    id: i64,
    is_eliminated_in_winners: bool,
    is_eliminated_in_losers: bool,
) -> Result<(), String> {
    let pool = state.lock().read().await.as_ref().cloned().ok_or("No DB open")?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE GameBoard
        SET
            isEliminatedInWinners = ?,
            isEliminatedInLosers = ?
        WHERE id = ?
        "#
    )
    .bind(is_eliminated_in_winners)
    .bind(is_eliminated_in_losers)
    .bind(id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query(
        r#"
        UPDATE Config SET value = ? WHERE key = 'LastUpdateTime'
        "#
    )
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_game_tiles(
    state: State<'_, Db>,
    tiles: Vec<GameTile>,
) -> Result<(), String> {
    if tiles.is_empty() {
        return Err("No tiles to update".to_string());
    }

    let pool = state.lock().read().await.as_ref().cloned().ok_or("No DB open")?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    for tile in &tiles {
        sqlx::query(
            r#"
            UPDATE GameBoard
            SET
                isEliminatedInWinners = ?,
                isEliminatedInLosers = ?
            WHERE id = ?
            "#
        )
        .bind(tile.is_eliminated_in_winners)
        .bind(tile.is_eliminated_in_losers)
        .bind(tile.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query(
        r#"
        UPDATE Config SET value = ? WHERE key = 'LastUpdateTime'
        "#
    )
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    // A save written before unsold numbers existed
    async fn old_save() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE GameBoard (
                id INT PRIMARY KEY,
                isEliminatedInWinners BOOLEAN NOT NULL,
                isEliminatedInLosers BOOLEAN NOT NULL
            )",
        )
        .execute(&pool)
        .await
        .unwrap();
        sqlx::query("INSERT INTO GameBoard VALUES (1, 1, 0), (2, 0, 0)")
            .execute(&pool)
            .await
            .unwrap();
        pool
    }

    #[tokio::test]
    async fn adds_the_column_and_defaults_every_ticket_to_sold() {
        let pool = old_save().await;
        ensure_unsold_column(&pool).await.unwrap();

        let tiles = sqlx::query_as::<_, GameTile>(
            "SELECT id, isEliminatedInWinners, isEliminatedInLosers, isUnsold FROM GameBoard ORDER BY id",
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(tiles.len(), 2);
        assert!(tiles.iter().all(|t| !t.is_unsold));
        assert!(tiles[0].is_eliminated_in_winners);
    }

    #[tokio::test]
    async fn is_a_no_op_the_second_time() {
        let pool = old_save().await;
        ensure_unsold_column(&pool).await.unwrap();
        sqlx::query("UPDATE GameBoard SET isUnsold = 1 WHERE id = 2")
            .execute(&pool)
            .await
            .unwrap();

        ensure_unsold_column(&pool).await.unwrap();

        let unsold: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM GameBoard WHERE isUnsold = 1")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(unsold.0, 1, "a second run must not wipe the unsold marks");
    }
}
