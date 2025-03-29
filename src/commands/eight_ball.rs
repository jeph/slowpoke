use poise::serenity_prelude::CreateEmbed;
use poise::{command, CreateReply};
use rand::prelude::SliceRandom;
use rand::thread_rng;
use tracing::info;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

const EIGHT_BALL_RESPONSES: &[&str] = &[
  "It is certain",
  "Outlook good",
  "Most likely",
  "Signs point to yes",
  "Yes",
  "It is decidedly so",
  "As I see it, yes",
  "You may rely on it",
  "Yes definitely",
  "Without a doubt",
  "The odds are in your favor",
  "All signs say yes",
  "Absolutely!",
  "Without hesitation, yes",
  "The universe says yes",
  "You can bet on it",
  "Yes, without question",
  "The answer is a resounding yes",
  "It’s a green light",
  "Yes, and it’s looking great",
  "Don’t count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful",
  "Not a chance",
  "Outlook is grim",
  "Don't count on it",
  "Absolutely not",
  "The stars say no",
  "The answer is no",
  "I wouldn’t count on it",
  "Highly unlikely",
  "The universe says no",
  "No way",
  "The answer is a firm no",
  "Negative vibes only",
  "The signs aren’t good",
  "It’s a red light",
  "No, and don’t ask again",
];

#[command(
  slash_command,
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
