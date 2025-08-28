use crate::file_service::Db;
use sqlx::FromRow;
use tauri::State;

#[derive(Debug, FromRow, serde::Serialize)]
pub struct MatchResult {
    pub id: i64,
    pub is_eliminated_in_winners: bool,
    pub is_eliminated_in_losers: bool,
    pub is_winner_in_winners: bool,
    pub is_winner_in_losers: bool,
}

#[tauri::command]
pub async fn get_all_match_results(
    state: State<'_, Db>,
) -> Result<Vec<MatchResult>, String> {
    let pool = state.0.read().await.as_ref().cloned().ok_or("No DB open")?;
    let results = sqlx::query_as::<_, MatchResult>(
        r#"
        SELECT id, isEliminatedInWinners, isEliminatedInLosers, isWinnerInWinners, isWinnerInLosers
        FROM MatchResults
        ORDER BY id
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(results)
}