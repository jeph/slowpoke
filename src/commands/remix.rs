use crate::utils::gemini_imagen_client::GeminiImagenPromptWithImage;
use crate::Data;
use poise::serenity_prelude::{Color, CreateAttachment, CreateEmbed};
use poise::{command, CreateReply};
use tracing::info;

type Error = Box<dyn std::error::Error + Send + Sync>;
type PrefixContext<'a> = poise::PrefixContext<'a, Data, Error>;

#[command(prefix_command)]
pub async fn remix(
  ctx: PrefixContext<'_>,
  #[description = "How to remix the image"]
  #[rest]
  prompt: Option<String>,
) -> Result<(), Error> {
  // As AI models take some time to respond, defer must be called first in order to keep
  // the interaction alive.
  ctx.defer().await?;
  
  let prompt = match prompt {
    Some(prompt) => prompt,
    None => {
      info!("No prompt provided for remix command");
      let embed = CreateEmbed::default()
        .title("Error")
        .description("Please instructions on how to remix.")
        .color(Color::from_rgb(137, 220, 235));
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };
  info!("Remix command invoked with prompt: {}", prompt);

  info!("Getting reply message...");
  let reply_message = match &ctx.msg.referenced_message {
    Some(message) => message,
    None => {
      let embed = CreateEmbed::default()
        .title("Error")
        .description("Please reply to a message with an image to remix it.")
        .color(Color::from_rgb(137, 220, 235));
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };
  info!("Got reply message");

  info!("Getting first image from message attachments...");
  let image =
    reply_message
      .attachments
      .iter()
      .find(|attachment| match &attachment.content_type {
        Some(content_type) => content_type.starts_with("image/"),
        None => false,
      });

  let image = match image {
    Some(image) => image,
    None => {
      let embed = CreateEmbed::default()
        .title("Error")
        .description("The referenced message does not contain an image.")
        .color(Color::from_rgb(137, 220, 235));
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };
  info!("Got first image from message attachments");

  let mime_type = image.content_type.clone().unwrap();
  let image_data = match image.download().await {
    Ok(image_data) => image_data,
    Err(_) => {
      info!("Failed to download");
      let embed = CreateEmbed::default()
        .title("Error")
        .description("Failed to retrieve the image from the referenced message.")
        .color(Color::from_rgb(137, 220, 235));
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };

  let gemini_imagen_client = &ctx.data().gemini_imagen_client;
  let imagen_prompt_with_image = GeminiImagenPromptWithImage {
    prompt: prompt.clone(),
    image_mime_type: mime_type,
    image_data,
  };

  let image_data = match gemini_imagen_client
    .prompt_with_image(imagen_prompt_with_image)
    .await
  {
    Ok(generated_image) => generated_image.image_data,
    Err(e) => {
      info!("Error remixing image: {:?}", e);
      let embed = CreateEmbed::default()
        .title("Error remixing image")
        .description(
          "Failed to generate the remixed image. Try altering the remix prompt.",
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
    .title("Remix!")
    .description(prompt)
    .color(Color::from_rgb(137, 220, 235))
    .attachment(&attachment.filename);

  ctx
    .send(
      CreateReply::default()
        .embed(embed)
        .attachment(attachment)
        .reply(true),
    )
    .await?;

  Ok(())
}
