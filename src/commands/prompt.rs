use crate::utils::gemini_client::GeminiPrompt;
use poise::command;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(
  slash_command,
  prefix_command,
  description_localized("en-US", "Ask the LLM a question"),
  aliases("proompt")
)]
pub async fn prompt(
  ctx: Context<'_>,
  #[description = "Prompt for the LLM"] prompt: String,
) -> Result<(), Error> {
  let gemini_client = &ctx.data().gemini_client;
  let system_instruction = Some(
    "Return all responses in markdown. Keep responses under 2000 characters.".to_owned(),
  );
  let response = gemini_client
    .prompt(GeminiPrompt {
      system_instruction,
      prompt,
    })
    .await
    .unwrap()
    .response;
  ctx.say(response).await?;
  Ok(())
}
