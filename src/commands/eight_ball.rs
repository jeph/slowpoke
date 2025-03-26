use poise::serenity_prelude::CreateEmbed;
use poise::{command, CreateReply};
use rand::prelude::SliceRandom;
use rand::thread_rng;
use tracing::info;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

const EIGHT_BALL_RESPONSES: &[&str] = &[
  "It is certain",
  "Reply hazy, try again",
  "Don’t count on it",
  "It is decidedly so",
  "Ask again later",
  "My reply is no",
  "Without a doubt",
  "Better not tell you now",
  "My sources say no",
  "Yes definitely",
  "Cannot predict now",
  "Outlook not so good",
  "You may rely on it",
  "Concentrate and ask again",
  "Very doubtful",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
];

#[command(
  slash_command,
  prefix_command,
  rename = "8ball",
  description_localized("en-US", "Ask the 8 ball a question")
)]
pub async fn eight_ball(
  ctx: Context<'_>,
  #[description = "Question for the 8 ball"] question: Option<String>,
) -> Result<(), Error> {
  info!("Start processing 8 ball command");
  let eight_ball_response = EIGHT_BALL_RESPONSES
    .choose(&mut thread_rng())
    .unwrap()
    .to_string();

  let embed = CreateEmbed::default().title("8 Ball Has Spoken");
  let embed = match question {
    Some(question) => {
      info!("Received question. Formatting question in the embed.");
      if question.len() > 254 {
        embed.description("🎱 Your question is too long! Try a shorter question.")
      } else {
        embed.field(
          format!("❓ {}", question),
          format!("🎱 {}", eight_ball_response),
          false,
        )
      }
    }
    None => {
      info!("Received no question. Returning without a question in the embed.");
      embed.description(format!("🎱 {}", eight_ball_response))
    }
  };
  let builder = CreateReply::default().embed(embed);

  ctx.send(builder).await?;
  info!("Finished processing 8 ball command");
  Ok(())
}
