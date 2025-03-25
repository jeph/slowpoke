use poise::serenity_prelude::CreateEmbed;
use poise::{command, CreateReply};
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
pub async fn eight_ball(
  ctx: Context<'_>,
  #[description = "Question for the 8 ball"] question: Option<String>,
) -> Result<(), Error> {
  let eight_ball_response = EIGHT_BALL_RESPONSES
    .choose(&mut thread_rng())
    .unwrap()
    .to_string();

  let embed = CreateEmbed::default().title("The 8 Ball Has Spoken");
  let embed = match question {
    Some(question) => embed.field(
      format!("❓ {}", question),
      format!("🎱 {}", eight_ball_response),
      false,
    ),
    None => embed.description(format!("🎱 {}", eight_ball_response)),
  };
  let builder = CreateReply::default().embed(embed);

  ctx.send(builder).await?;
  Ok(())
}
