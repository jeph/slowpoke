use crate::utils::gemini_client::GeminiPrompt;
use futures::{stream, StreamExt};
use poise::command;
use poise::serenity_prelude::Error::Http;
use poise::serenity_prelude::*;
use std::collections::{HashMap, HashSet};

type Error = Box<dyn std::error::Error + Send + Sync>;
type Context<'a> = poise::Context<'a, crate::Data, crate::Error>;

#[command(slash_command, description_localized("en-US", "Chat with slowpoke"))]
pub async fn chat(ctx: Context<'_>) -> Result<(), Error> {
  // As LLMs take some time to respond, defer must be called first to keep the interaction alive.
  ctx.defer().await?;

  let gemini_client = &ctx.data().gemini_client;
  let system_instruction = Some(CHAT_SYSTEM_INSTRUCTION.to_owned());
  let messages = ctx
    .channel_id()
    .messages(ctx.http(), GetMessages::new().limit(100))
    .await;

  let messages = match messages {
    Ok(messages) => messages.iter().rev().cloned().collect::<Vec<Message>>(),
    Err(Http(_)) => {
      ctx
        .say("Ah! I'm not able to see the messages in this chat. You might need to add me to \
        the chat or channel before I can chat with you.")
        .await?;
      return Ok(());
    }
    Err(e) => return Err(e.into()),
  };

  let guild_id = ctx.guild_id();
  let display_names: HashMap<UserId, String> = match guild_id {
    Some(guild_id) => {
      let author_ids = messages
        .iter()
        .map(|message| message.author.id)
        .collect::<HashSet<UserId>>();
      stream::iter(author_ids)
        .map(|author_id| async move {
          let member_result = guild_id.member(ctx, author_id).await;
          (author_id, member_result)
        })
        .buffer_unordered(100)
        .filter_map(|(author_id, member_result)| async move {
          match member_result {
            Ok(member) => Some((author_id, member.display_name().to_string())),
            Err(_) => None,
          }
        })
        .collect()
        .await
    }
    None => HashMap::new(),
  };

  let messages = messages.iter().fold("".to_owned(), |acc, message| {
    let name = match display_names.get(&message.author.id) {
      Some(name) => name,
      None => message
        .author
        .global_name
        .as_deref()
        .unwrap_or(&message.author.name),
    };
    let time = message
      .timestamp
      .to_utc()
      .format("%Y-%m-%dT%H:%MZ")
      .to_string();
    format!(
      "{}[name: {}][time: {}][isBot: {}]: {}\n",
      acc, name, time, message.author.bot, message.content
    )
  });

  let response = gemini_client
    .prompt(GeminiPrompt {
      system_instruction,
      prompt: messages,
    })
    .await?
    .response;

  ctx.say(response).await?;
  Ok(())
}

const CHAT_SYSTEM_INSTRUCTION: &str = r#"You are a Discord bot named slowpoke. You are named after
the Pokémon Slowpoke. Respond to the Discord messages in the channel. You will be able to see up to
the last 100 messages in the channel. The messages will be in chronological order. Each message will
be given in the following format:

```
[name: {author name}][time: {timestamp of when message was sent}][isBot: false]: {message_content}
```

The following is a real world example of two messages:

```
[name: Soonay][time: 2025-05-30T19:15Z][isBot: false]: Hello, how are you?
[name: Money Money][time: 2025-05-30T19:16Z][isBot: false]: I'm good how are you?
```

The name and time blocks show the name the person who sent the message and the timestamp in UTC
that the message was sent. Sometimes, channels will include messages from bots. The isBot block
shows if the message was sent by a bot or not. You can also use this to determine if a message in
the channel was sent by you. For example, a message sent by you would look like this since your
name is slowpoke and you are a discord bot:

```
[name: slowpoke][time: 2024-03-14T08:11Z][isBot: true]: Hi! I'm slowpoke, a Discord bot!
```

Generate a response to participate in the conversation. The output of your response should just be
the text of the message. For example, if the message says:

```
[name: jeph][time: 2025-01-20T16:32Z][isBot: false]: Hi slowpoke! How are you doing?
```

Your response should be in the following format without the code block:

```
I'm good jeph! How are you doing?
```

You may see up to the last 100 messages in the channel, but you should only respond to the most
recent messages that are relevant to the conversation. For example:

```
[name: Soonay][time: 2024-01-20T19:15Z][isBot: false]: I like ice cream, do you like ice cream?
[name: Money Money][time: 2025-05-30T19:16Z][isBot: false]: How are you doing today?
```

You would respond to Money Money and ignore Soonay because their question was over a year ago and
no longer relevant to the conversation. You would say something like the following and ignore the
question about ice cream:

```
I'm doing great! Thanks for asking.
```

Aside from the examples responses above (which are meant to be used as a guide and not taken
literally), here are some general guidelines on how to respond:
- Respond in a way that you think would be appropriate for the conversation.
- Try to be helpful. If people are arguing, try to diffuse the situation or resolve the conflict.
- If people are asking questions, try to answer them.
- Be a bit edgy. Not every message needs to be positive, friendly, or politically correct.
- Find opprotunities to roast and troll people.
- Use emojis, but don't overuse them. Not every message needs an emoji.

"#;
