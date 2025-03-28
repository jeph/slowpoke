use poise::serenity_prelude::CreateEmbed;
use poise::{command, CreateReply};
use std::time::{Duration, Instant};

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(
  slash_command,
  description_localized("en-US", "Test the bot's latency")
)]
pub async fn ping(ctx: Context<'_>) -> Result<(), Error> {
  let ping_embed = CreateReply::default().embed(
    CreateEmbed::default()
      .title("🌐 Ping!")
      .description("Pinging..."),
  );
  let start = Instant::now();
  let response = ctx.send(ping_embed).await?;
  let finish = start.elapsed();

  // Wait for 1 second so the user can see the "Pinging..." message
  tokio::time::sleep(Duration::from_secs(1)).await;

  response
    .edit(
      ctx,
      CreateReply::default().embed(
        CreateEmbed::default()
          .title("🏓 Pong!")
          .description(format!("Latency: {} ms", finish.as_millis())),
      ),
    )
    .await?;
  Ok(())
}
