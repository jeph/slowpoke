use crate::utils::gemini_imagen_client::GeminiImagenPrompt;
use poise::serenity_prelude::{Color, CreateAttachment, CreateEmbed};
use poise::{command, CreateReply};
use tracing::info;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(
  slash_command,
  description_localized("en-US", "Image generation with slowpoke")
)]
pub async fn imagine(
  ctx: Context<'_>,
  #[description = "Prompt for image generation"] prompt: String,
) -> Result<(), Error> {
  // As AI models take some time to respond, defer must be called first in order to keep
  // the interaction alive.
  ctx.defer().await?;

  let gemini_imagen_client = &ctx.data().gemini_imagen_client;
  let imagen_prompt = GeminiImagenPrompt {
    prompt: prompt.clone(),
  };

  let image_data = match gemini_imagen_client.prompt(imagen_prompt).await {
    Ok(generated_image) => generated_image.image_data,
    Err(e) => {
      info!("Error imagining image: {:?}", e);
      let embed = CreateEmbed::default()
        .title("Error imagining image")
        .description(
          "Failed to imagine image. Try altering the prompt or trying again later.",
        )
        .color(Color::from_rgb(137, 220, 235));
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };

  let attachment = CreateAttachment::bytes(image_data, "image.png");

  let embed = CreateEmbed::default()
    .title("Imagine")
    .description(prompt)
    .color(Color::from_rgb(137, 220, 235))
    .attachment(&attachment.filename);

  ctx
    .send(CreateReply::default().embed(embed).attachment(attachment))
    .await?;

  Ok(())
}
