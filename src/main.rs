mod commands;
mod utils;

use crate::commands::eight_ball::eight_ball;
use crate::commands::ping::ping;
use crate::commands::prompt::prompt;
use crate::utils::gemini_client::GeminiClient;
use poise::serenity_prelude::{
  ActivityData, ActivityType, ClientBuilder, GatewayIntents,
};
use poise::{Framework, FrameworkOptions};
use shuttle_runtime::SecretStore;
use shuttle_serenity::ShuttleSerenity;
use std::env;
use text_splitter::{Characters, MarkdownSplitter};
use tracing::info;

struct Data {
  gemini_client: GeminiClient,
  markdown_splitter: MarkdownSplitter<Characters>,
}

type Error = Box<dyn std::error::Error + Send + Sync>;

#[shuttle_runtime::main]
async fn main(#[shuttle_runtime::Secrets] secret_store: SecretStore) -> ShuttleSerenity {
  info!("Getting discord token from secret store");
  let token = secret_store
    .get("DISCORD_TOKEN")
    .expect("DISCORD_TOKEN was not found");
  info!("Successfully got discord token from secret store");

  let gemini_api_key = secret_store
    .get("GEMINI_API_KEY")
    .expect("GEMINI_API_KEY was not found");
  let gemini_client = GeminiClient::new(gemini_api_key, reqwest::Client::new());

  let markdown_splitter = MarkdownSplitter::new(4096);

  info!("Setting up the bot");
  let framework = Framework::builder()
    .options(FrameworkOptions {
      commands: vec![ping(), eight_ball(), prompt()],
      ..Default::default()
    })
    .setup(|context, _ready, framework| {
      Box::pin(async move {
        poise::builtins::register_globally(context, &framework.options().commands)
          .await?;

        let activity_data = ActivityData {
          name: "Pokémon".to_owned(),
          kind: ActivityType::Playing,
          state: None,
          url: None,
        };
        context.set_activity(Some(activity_data));
        Ok(Data {
          gemini_client,
          markdown_splitter,
        })
      })
    })
    .build();

  let intents = GatewayIntents::non_privileged();

  let client = ClientBuilder::new(token, intents)
    .framework(framework)
    .await
    .map_err(shuttle_runtime::CustomError::new)?;
  info!("Successfully set up the bot");

  Ok(client.into())
}
