use crate::utils::gemini_client::GeminiPrompt;
use futures::{stream, TryStreamExt};
use futures::StreamExt;
use poise::serenity_prelude::{Color, CreateEmbed, CreateEmbedFooter};
use poise::{command, CreateReply};

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(
  slash_command,
  description_localized("en-US", "Ask the LLM a question"),
  aliases("proompt")
)]
pub async fn prompt(
  ctx: Context<'_>,
  #[description = "Prompt for the LLM"] prompt: String,
) -> Result<(), Error> {
  // As LLMs take some time to respond, defer must be called first to keep the interaction alive.
  ctx.defer().await?;

  let gemini_client = &ctx.data().gemini_client;
  let markdown_splitter = &ctx.data().markdown_splitter;
  let system_instruction = Some(PROMPT_SYSTEM_INSTRUCTION.to_owned());

  let response = gemini_client
    .prompt(GeminiPrompt {
      system_instruction,
      prompt: prompt.clone(),
    })
    .await?
    .response;

  let prompt_header = format!("***{}***\n\n", prompt);
  let response = format!("{}{}", prompt_header, response);

  let responses = markdown_splitter.chunks(&response).collect::<Vec<&str>>();
  let responses = responses
    .iter()
    .enumerate()
    .map(|(index, response)| {
      let footer = if responses.len() != 1 {
        Some(format!("{} / {}", index + 1, responses.len()))
      } else {
        None
      };

      let embed = CreateEmbed::default()
        .color(Color::from_rgb(166, 227, 161))
        .description(response.to_owned());
      let embed = match footer {
        Some(footer) => embed.footer(CreateEmbedFooter::new(footer)),
        None => embed,
      };

      CreateReply::default().embed(embed)
    })
    .collect::<Vec<CreateReply>>();

  stream::iter(responses)
    .map(|reply| Ok::<_, Error>(reply))
    .try_for_each(|response| async move {
      ctx.send(response).await?;
      Ok(())
    })
    .await?;

  Ok(())
}

const PROMPT_SYSTEM_INSTRUCTION: &str = r#"Return your response in markdown. Give as complete of an
answer as possible. Assume whoever you're talking to will not be able to respond back so do not ask
for follow-ups. Do not hallucinate."#;
