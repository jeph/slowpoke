mod commands;
use crate::commands::ping::ping;
use crate::commands::eight_ball::eight_ball;
use dotenvy::dotenv;
use poise::serenity_prelude::{
  ActivityData, ActivityType, ClientBuilder, GatewayIntents,
};
use poise::FrameworkOptions;
use std::env;

struct Data {}
type Error = Box<dyn std::error::Error + Send + Sync>;

#[tokio::main]
async fn main() {
  dotenv().ok();

  let token =
    env::var("DISCORD_TOKEN").expect("DISCORD_TOKEN was not found in the environment");

  let framework = poise::Framework::builder()
    .options(FrameworkOptions {
      commands: vec![ping(), eight_ball()],
      ..Default::default()
    })
    .setup(|context, _ready, framework| {
      Box::pin(async move {
        poise::builtins::register_globally(context, &framework.options().commands)
          .await?;

        let activity_data = ActivityData {
          name: "Pokemon".to_string(),
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
    .await;
  client.unwrap().start().await.unwrap();
}
