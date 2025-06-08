use poise::serenity_prelude::{ActivityData, ShardMessenger};
use rand::prelude::SliceRandom;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::time::interval;
use tracing::info;

static ACTIVITIES: OnceLock<Vec<ActivityData>> = OnceLock::new();

fn get_activities() -> &'static Vec<ActivityData> {
  ACTIVITIES.get_or_init(|| {
    vec![
      ActivityData::playing("Pokémon"),
      ActivityData::playing("Gooning Aim Trainer"),
      ActivityData::playing("Battletoads"),
      ActivityData::playing("Counter-Strike 2"),
      ActivityData::playing("Hello Kitty Island Adventure"),
      ActivityData::playing("Badminton"),
      ActivityData::watching("JasonTheWeen"),
      ActivityData::watching("xQc"),
      ActivityData::watching("Pokimane"),
      ActivityData::watching("Dantes"),
      ActivityData::listening("ZWE1HVNDXR"),
      ActivityData::listening("Illenium"),
      ActivityData::listening("The Chainsmokers"),
      ActivityData::listening("KSI"),
      ActivityData::custom("Going to Plan B"),
      ActivityData::custom("Clubbing at Mission"),
      ActivityData::custom("Waiting in line at Den Social"),
    ]
  })
}

pub fn start_activity_rotation(shard_messenger: &ShardMessenger) {
  let shard_messenger = shard_messenger.clone();
  tokio::spawn(async move {
    info!("Setting initial activity...");
    let initial_activity = get_activities().choose(&mut rand::thread_rng()).unwrap();
    shard_messenger.set_activity(Some(initial_activity.clone()));

    let mut interval = interval(Duration::from_secs(60 * 60));
    loop {
      interval.tick().await;

      let activity_data = get_activities()
        .choose(&mut rand::thread_rng())
        .unwrap()
        .clone();

      info!("Setting activity data to {:#?}", activity_data);
      shard_messenger.set_activity(Some(activity_data));
    }
  });
}
