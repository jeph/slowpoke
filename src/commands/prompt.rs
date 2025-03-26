use crate::utils::gemini_client::GeminiPrompt;
use poise::serenity_prelude::{CreateEmbed, CreateEmbedFooter};
use poise::{command, CreateReply};

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

const SYSTEM_INSTRUCTION: &str = "Return your response in markdown. Give as complete of an answer \
as possible. Assume whoever you're talking to will not be able to respond back so do not ask for \
follow-ups. Do not hallucinate.";

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
  let markdown_splitter = &ctx.data().markdown_splitter;
  let system_instruction = Some(SYSTEM_INSTRUCTION.to_owned());

  // As LLMs take some time to respond, defer must be called first in order to keep
  // the interaction alive.
  ctx.defer().await?;

  let response = gemini_client
    .prompt(GeminiPrompt {
      system_instruction,
      prompt: prompt.clone(),
    })
    .await
    .unwrap()
    .response;

  let prompt_header = format!("***{}***\n\n", prompt);
  let response = format!("{}{}", prompt_header, response);

  let responses = markdown_splitter.chunks(&response).collect::<Vec<&str>>();
  let responses = responses
    .iter()
    .enumerate()
    .map(|(index, response)| {
      let footer = format!("{} / {}", index + 1, responses.len());
      let embed = CreateEmbed::default()
        .description(response.to_owned())
        .footer(CreateEmbedFooter::new(footer));
      CreateReply::default().embed(embed)
    })
    .collect::<Vec<CreateReply>>();

  for response in responses {
    ctx.send(response).await?;
  }

  Ok(())
}
