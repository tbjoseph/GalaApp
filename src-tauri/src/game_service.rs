use crate::file_service::Db;
use sqlx::FromRow;
use tauri::State;

#[derive(Debug, FromRow, serde::Serialize)]
pub struct GameTile {
    pub id: i64,

    #[sqlx(rename = "isEliminatedInWinners")]
    #[serde(rename = "isEliminatedInWinners")]
    pub is_eliminated_in_winners: bool,

    #[sqlx(rename = "isEliminatedInLosers")]
    #[serde(rename = "isEliminatedInLosers")]
    pub is_eliminated_in_losers: bool,

    #[sqlx(rename = "isWinnerInWinners")]
    #[serde(rename = "isWinnerInWinners")]
    pub is_winner_in_winners: bool,

    #[sqlx(rename = "isWinnerInLosers")]
    #[serde(rename = "isWinnerInLosers")]
    pub is_winner_in_losers: bool,
}

#[tauri::command]
pub async fn get_game_board(
    state: State<'_, Db>,
) -> Result<Vec<GameTile>, String> {
    let pool = state.0.read().await.as_ref().cloned().ok_or("No DB open")?;
    let results = sqlx::query_as::<_, GameTile>(
        r#"
        SELECT id, isEliminatedInWinners, isEliminatedInLosers, isWinnerInWinners, isWinnerInLosers
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
    is_winner_in_winners: bool,
    is_winner_in_losers: bool,
) -> Result<(), String> {
    let pool = state.0.read().await.as_ref().cloned().ok_or("No DB open")?;
    sqlx::query(
        r#"
        UPDATE GameBoard
        SET
            isEliminatedInWinners = ?,
            isEliminatedInLosers = ?,
            isWinnerInWinners = ?,
            isWinnerInLosers = ?
        WHERE id = ?
        "#
    )
    .bind(is_eliminated_in_winners)
    .bind(is_eliminated_in_losers)
    .bind(is_winner_in_winners)
    .bind(is_winner_in_losers)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}