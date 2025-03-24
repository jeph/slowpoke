use poise::command;
use rand::prelude::SliceRandom;
use rand::thread_rng;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

const EIGHT_BALL_RESPONSES: &[&str] = &[
  "Maybe",
  "Ask again later",
  "Definitely",
  "Absolutely not",
  "I wouldn't count on it",
  "It is certain",
  "Don't count on it",
  "My sources say no",
  "Yes, in due time",
  "Very doubtful",
];

#[command(slash_command, prefix_command, rename = "8ball")]
pub async fn eight_ball(ctx: Context<'_>) -> Result<(), Error> {
  let eight_ball_response = EIGHT_BALL_RESPONSES
    .choose(&mut thread_rng())
    .unwrap()
    .to_string();
  ctx.say(eight_ball_response).await?;
  Ok(())
}
