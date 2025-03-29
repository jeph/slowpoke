use poise::serenity_prelude::{Color, CreateEmbed, GetMessages};
use poise::{command, CreateReply};

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(
  slash_command,
  description_localized("en-US", "Thanks for the invite, asshole")
)]
pub async fn tfti(ctx: Context<'_>) -> Result<(), Error> {
  let tfti_multiplier = match ctx
    .channel_id()
    .messages(ctx.http(), GetMessages::new().limit(9))
    .await
  {
    Ok(messages) => messages
      .iter()
      .take_while(|message| {
        let is_bot_message = message.author.id == ctx.framework().bot_id;
        let is_tfti = message.embeds.iter().any(|embed| match &embed.title {
          Some(title) => title.contains("😤 Tfti"),
          None => false,
        });
        is_bot_message && is_tfti
      })
      .count(),
    Err(_) => 0,
  };

  let embed = CreateEmbed::default()
    .url("https://youtube.com/shorts/pFmq2xu8Hvw?si=ysapcGMaM6YqEcOI");
  let embed = match tfti_multiplier {
    0 => embed
      .title("😤 Tfti")
      .description("Thanks for the invite, asshole")
      .color(Color::from_rgb(243, 139, 168)),
    1 => embed
      .title("😤 Tfti x2")
      .description("Thanks for the invite, asshole\nOh wait, that was just said")
      .color(Color::from_rgb(250, 179, 135)),
    2 => embed
      .title("😤 Tfti x3")
      .description("Thanks for the invite, asshole\nFeels like I'm on repeat here")
      .color(Color::from_rgb(166, 227, 161)),
    3 => embed
      .title("😤 Tfti x4")
      .description("Thanks for the invite, asshole\nGuess we'll just keep saying it")
      .color(Color::from_rgb(137, 220, 235)),
    4 => embed
      .title("😤 Tfti x5")
      .description("Thanks for the invite, asshole\nI could stop, but why bother?")
      .color(Color::from_rgb(180, 190, 254)),
    5 => embed
      .title("😤 Tfti x6")
      .description(
        "Thanks for the invite, asshole\nJust keep pretending I don't exist, as usual",
      )
      .color(Color::from_rgb(203, 166, 247)),
    6 => embed
      .title("😤 Tfti x7")
      .description("Thanks for the invite, asshole\nStill feels worth repeating")
      .color(Color::from_rgb(245, 194, 231)),
    7 => embed
      .title("😤 Tfti x8")
      .description("Thanks for the invite, asshole\nI guess this is just what I do now")
      .color(Color::from_rgb(148, 226, 213)),
    8 => embed
      .title("😤 Tfti x9")
      .description(
        "Thanks for the invite, asshole\nForever and always, from the bottom of my heart",
      )
      .color(Color::from_rgb(245, 224, 220)),
    _ => embed
      .title("😤 Tfti ♾️")
      .description("Thanks for the invite, asshole\nTo infinity and beyond")
      .color(Color::from_rgb(116, 199, 236)),
  };

  let builder = CreateReply::default().embed(embed);
  ctx.send(builder).await?;
  Ok(())
}
