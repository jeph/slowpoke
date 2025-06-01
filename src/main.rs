mod commands;
mod utils;

use crate::commands::chat::chat;
use crate::commands::eight_ball::eight_ball;
use crate::commands::imagine::imagine;
use crate::commands::ping::ping;
use crate::commands::prompt::prompt;
use crate::commands::tfti::tfti;
use crate::utils::gemini_client::GeminiClient;
use crate::utils::gemini_imagen_client::GeminiImagenClient;
use poise::serenity_prelude::{
  ActivityData, ActivityType, ClientBuilder, GatewayIntents,
};
use poise::{EditTracker, Framework, FrameworkOptions, PrefixFrameworkOptions};
use shuttle_runtime::SecretStore;
use shuttle_serenity::ShuttleSerenity;
use std::env;
use std::sync::Arc;
use text_splitter::{Characters, MarkdownSplitter};
use tracing::info;

struct Data {
  gemini_client: GeminiClient,
  gemini_imagen_client: GeminiImagenClient,
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

  info!("Getting gemini api key from secret store");
  let gemini_api_key = secret_store
    .get("GEMINI_API_KEY")
    .expect("GEMINI_API_KEY was not found");
  info!("Successfully got gemini api key from secret store");

  let gemini_client = GeminiClient::new(gemini_api_key.clone(), reqwest::Client::new());
  let gemini_imagen_client =
    GeminiImagenClient::new(gemini_api_key.clone(), reqwest::Client::new());

  let markdown_splitter = MarkdownSplitter::new(4096);

  info!("Initializing slowpoke...");
  let framework = Framework::builder()
    .options(FrameworkOptions {
      commands: vec![ping(), eight_ball(), prompt(), chat(), tfti(), imagine()],
      prefix_options: PrefixFrameworkOptions {
        prefix: Some("!".into()),
        edit_tracker: Some(Arc::new(EditTracker::for_timespan(
          std::time::Duration::from_secs(3600),
        ))),
        case_insensitive_commands: true,
        ..Default::default()
      },
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

        info!("Setting activity data to {:#?}", activity_data);
        context.set_activity(Some(activity_data));

        Ok(Data {
          gemini_client,
          gemini_imagen_client,
          markdown_splitter,
        })
      })
    })
    .build();

  let intents = GatewayIntents::non_privileged() | GatewayIntents::MESSAGE_CONTENT;

  let client = ClientBuilder::new(token, intents)
    .framework(framework)
    .await
    .map_err(shuttle_runtime::CustomError::new)?;
  info!("Initialized slowpoke!");

  Ok(client.into())
}
