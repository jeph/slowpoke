mod commands;
use crate::commands::eight_ball::eight_ball;
use crate::commands::ping::ping;
use poise::serenity_prelude::{
  ActivityData, ActivityType, ClientBuilder, GatewayIntents,
};
use poise::{Framework, FrameworkOptions};
use shuttle_runtime::SecretStore;
use shuttle_serenity::ShuttleSerenity;
use std::env;
use tracing::info;

struct Data {}
type Error = Box<dyn std::error::Error + Send + Sync>;

#[shuttle_runtime::main]
async fn main(#[shuttle_runtime::Secrets] secret_store: SecretStore) -> ShuttleSerenity {
  info!("Getting discord token from secret store");
  let token = secret_store
    .get("DISCORD_TOKEN")
    .expect("DISCORD_TOKEN was not found");
  info!("Successfully got discord token from secret store");

  info!("Setting up the bot");
  let framework = Framework::builder()
    .options(FrameworkOptions {
      commands: vec![ping(), eight_ball()],
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
        Ok(Data {})
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
