use crate::utils::gemini_imagen_client::GeminiImagenPromptWithImage;
use crate::Data;
use poise::serenity_prelude::{Color, CreateAttachment, CreateEmbed, Message};
use poise::{command, CreateReply};
use rand::prelude::SliceRandom;
use rand::thread_rng;
use tracing::info;

type Error = Box<dyn std::error::Error + Send + Sync>;
type PrefixContext<'a> = poise::PrefixContext<'a, Data, Error>;

const ERROR_EMBED_COLOR: Color = Color::RED;

const COLORS: [(u8, u8, u8); 12] = [
  (245, 194, 231),
  (203, 166, 247),
  (243, 139, 168),
  (235, 160, 172),
  (250, 179, 135),
  (249, 226, 175),
  (166, 227, 161),
  (148, 226, 213),
  (137, 220, 235),
  (116, 199, 236),
  (137, 180, 250),
  (180, 190, 254),
];

#[command(prefix_command)]
pub async fn remix(
  ctx: PrefixContext<'_>,
  #[description = "How to remix the image"]
  #[rest]
  prompt: Option<String>,
) -> Result<(), Error> {
  let prompt = match prompt {
    Some(prompt) => prompt,
    None => {
      info!("No prompt provided for remix command");
      let embed = CreateEmbed::default()
        .title("Error")
        .description("Please instructions on how to remix.")
        .color(ERROR_EMBED_COLOR);
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
        .color(ERROR_EMBED_COLOR);
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };
  info!("Got reply message");

  info!("Getting image from message...");
  let image_data = match get_image_data_from_attachments(reply_message).await {
    Some(image_data) => image_data,
    None => {
      info!("No image found in attachments... Checking embeds...");
      match get_image_data_from_embed(reply_message).await {
        Some(image_data) => image_data,
        None => {
          info!("No image found in attachments or embeds.");
          let embed = CreateEmbed::default()
            .title("Error getting image")
            .description("Could not extract image from the referenced message.")
            .color(ERROR_EMBED_COLOR);
          ctx
            .send(CreateReply::default().embed(embed).reply(true))
            .await?;
          return Ok(());
        }
      }
    }
  };
  info!("Got image from reply message");

  let (mime_type, image_data) = image_data;
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
        .color(ERROR_EMBED_COLOR);
      ctx
        .send(CreateReply::default().embed(embed).reply(true))
        .await?;
      return Ok(());
    }
  };

  let attachment = CreateAttachment::bytes(image_data, "image.png");

  let color = COLORS.choose(&mut thread_rng()).unwrap();
  let embed = CreateEmbed::default()
    .title("Remix!")
    .description(prompt)
    .color(Color::from_rgb(color.0, color.1, color.2))
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

type ImageData = (String, Vec<u8>);

async fn get_image_data_from_attachments(message: &Message) -> Option<ImageData> {
  info!("Getting first image from message attachments...");
  let image =
    message
      .attachments
      .iter()
      .find(|attachment| match &attachment.content_type {
        Some(content_type) => content_type.starts_with("image/"),
        None => false,
      });

  let mime_type = image?.content_type.clone().unwrap();
  let image_data = image?.download().await.ok()?;

  Some((mime_type, image_data))
}

async fn get_image_data_from_embed(message: &Message) -> Option<(String, Vec<u8>)> {
  let embed = message.embeds.iter().find(|embed| embed.image.is_some())?;
  let image_url = embed.clone().image?.url;
  let response = reqwest::get(&image_url).await.ok()?;
  let image_data_bytes = response.bytes().await.ok()?;
  let mime_type = infer::get(&image_data_bytes)?.mime_type().to_string();

  if !mime_type.starts_with("image/") {
    return None;
  }

  Some((mime_type, image_data_bytes.to_vec()))
}
