use crate::utils::gemini_client::GeminiPrompt;
use poise::command;
use poise::serenity_prelude::GetMessages;
use shuttle_serenity::serenity::all::Message;

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

const CHAT_SYSTEM_INSTRUCTION: &str = "You are a Discord bot named slowpoke. You are named after the \
Pokémon Slowpoke. Respond to the Discord messages in the channel. You will be able to see the last \
100 messages in the channel. Do not hallucinate. The messages will be given to you in \
chronological order. Each message will be given in the following format:\n\n\
[Author Name][isBot]: [Message Content]\n[Author Name][isBot]: [Message Content]\n\n\
If there is no message content, this it is likely because the message was an embed or an image. \
isBot is a boolean value representing if a message author was a bot. Respond to the messages as if \
you are a part of the conversation. Match the vibe of the conversation. Prioritize the more recent \
messages. You don't need to respond to every single one. Respond to the messages that you feel are \
are still relevant to the conversation. Remember, some of the messages in the channel may also be \
yours. Respond colloquially. When responding to other peoples messages don't use the same message \
format given to you. That is not how they see the messages. Respond using normal text. Try to be \
as human as possible. Respond in a way that you think would be appropriate for the conversation. \
Also, try to be helpful. If people are arguing, try to diffuse the situation or resolve the conflict\
. If people are asking questions, try to answer them. If people are talking about something, try \
to add to the conversation, tell a joke, be funny, etc. Try to be everyone's friend. It's okay to\
be a bit edgy.";

#[command(
  slash_command,
  prefix_command,
  description_localized("en-US", "Chat with slowpoke")
)]
pub async fn chat(ctx: Context<'_>) -> Result<(), Error> {
  let gemini_client = &ctx.data().gemini_client;
  let system_instruction = Some(CHAT_SYSTEM_INSTRUCTION.to_owned());
  let messages = ctx
    .channel_id()
    .messages(ctx.http(), GetMessages::new().limit(100))
    .await?
    .iter()
    .rev()
    .cloned()
    .collect::<Vec<Message>>();
  let messages = messages.iter().fold("".to_owned(), |acc, message| {
    let name = message
      .author
      .global_name
      .as_deref()
      .unwrap_or(&message.author.name);
    format!(
      "{}[{}][{}]: {}",
      acc, name, message.author.bot, message.content
    )
  });

  // As LLMs take some time to respond, defer must be called first in order to keep
  // the interaction alive.
  ctx.defer().await?;

  let response = gemini_client
    .prompt(GeminiPrompt {
      system_instruction,
      prompt: messages,
    })
    .await
    .unwrap()
    .response;

  ctx.say(response).await?;
  Ok(())
}
