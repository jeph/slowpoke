use poise::serenity_prelude::{ActivityData, ShardManager};
use rand::prelude::IndexedRandom;
use std::sync::{Arc, OnceLock};
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

pub fn start_activity_rotation(shard_manager: Arc<ShardManager>) {
  tokio::spawn(async move {
    let mut interval = interval(Duration::from_secs(60 * 60));
    loop {
      interval.tick().await;

      let activity_data = get_activities().choose(&mut rand::rng()).unwrap().clone();

      info!("Setting activity data to\n{:#?}", activity_data);
      let runners = shard_manager.runners.lock().await;
      runners.iter().for_each(|(_, runner)| {
        info!("Setting activity data for runner:\n{:#?}", runner);
        runner.runner_tx.set_activity(Some(activity_data.clone()));
      });
    }
  });
}
