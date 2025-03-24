use std::time::{SystemTime, UNIX_EPOCH};
use poise::command;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(slash_command, prefix_command)]
pub async fn ping(ctx: Context<'_>) -> Result<(), Error> {
  let now = SystemTime::now();
  let current_epoch_ms = now.duration_since(UNIX_EPOCH).unwrap().as_millis() as i64;

  let msg_timestamp_ms = ctx.created_at().timestamp_millis();

  let elapsed_time_ms = current_epoch_ms - msg_timestamp_ms;
  let response = format!("pong! latency: {} ms", elapsed_time_ms);
  ctx.say(response).await?;
  Ok(())
}
