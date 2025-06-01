use crate::utils::gemini_imagen_client::GeminiImagenPrompt;
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use poise::serenity_prelude::{Color, CreateEmbed};
use poise::{command, CreateReply};
use shuttle_serenity::serenity::all::CreateAttachment;

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
  let gemini_imagen_client = &ctx.data().gemini_imagen_client;
  let imagen_prompt = GeminiImagenPrompt {
    prompt: prompt.clone(),
  };

  // As AI models take some time to respond, defer must be called first in order to keep
  // the interaction alive.
  ctx.defer().await?;

  let response = gemini_imagen_client
    .prompt(imagen_prompt)
    .await?
    .base_64_image;
  let image_bytes = STANDARD.decode(response).unwrap();

  let attachment = CreateAttachment::bytes(image_bytes, "image.png");

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
