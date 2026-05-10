export type AchievementGroup = 'Milestones' | 'Consistency' | 'Exploration' | 'Variety' | 'Social' | 'Hidden';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  group: AchievementGroup;
  target: number;
}

export interface AchievementStatus {
  id: string;
  earned: boolean;
  progress: number;
  target: number;
  earnedAt?: string;
  seen: boolean;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // Milestones
  { id: 'first_steps',       name: 'First Steps',       description: 'Log your first dance session.',         group: 'Milestones',  target: 1    },
  { id: 'on_the_floor',      name: 'On the Floor',      description: 'Log 10 total dances.',                  group: 'Milestones',  target: 10   },
  { id: 'boot_scootin',      name: "Boot Scootin'",     description: 'Log 50 total dances.',                  group: 'Milestones',  target: 50   },
  { id: 'dance_machine',     name: 'Dance Machine',     description: 'Log 100 total dances.',                 group: 'Milestones',  target: 100  },
  { id: 'cant_stop_now',     name: "Can't Stop Now",    description: 'Log 500 total dances.',                 group: 'Milestones',  target: 500  },
  { id: 'thousand_stepper',  name: 'Thousand Stepper',  description: 'Reach 1,000 total dances.',             group: 'Milestones',  target: 1000 },
  // Consistency
  { id: 'step_streak',       name: 'Step Streak',       description: 'Dance 3 days in a row.',                         group: 'Consistency', target: 3   },
  { id: 'dance_fever',       name: 'Dance Fever',       description: 'Dance 5 days in one week.',                       group: 'Consistency', target: 5   },
  { id: 'weekend_warrior',   name: 'Weekend Warrior',   description: 'Dance on both Friday and Saturday in the same week.', group: 'Consistency', target: 1 },
  { id: 'peak_season',       name: 'Peak Season',       description: 'Log 100 dances in a single month.',               group: 'Consistency', target: 100 },
  // Exploration
  { id: 'home_turf',         name: 'Home Turf',         description: 'Dance at the same venue 10 times.',                     group: 'Exploration', target: 10 },
  { id: 'wanderer',          name: 'Wanderer',          description: 'Dance at 3 different venues.',                           group: 'Exploration', target: 3  },
  { id: 'road_trip',         name: 'Road Trip',         description: 'Dance at 5 different venues.',                           group: 'Exploration', target: 5  },
  { id: 'bar_regular',       name: 'Bar Regular',       description: 'Return to the same venue 5 sessions in a row.',         group: 'Exploration', target: 5  },
  { id: 'dance_passport',    name: 'Dance Passport',    description: 'Visit 10 different venues.',                            group: 'Exploration', target: 10 },
  // Variety
  { id: 'variety_pack',      name: 'Variety Pack',      description: 'Dance 10 unique dances.',                     group: 'Variety', target: 10 },
  { id: 'collector',         name: 'Collector',         description: 'Dance 25 unique dances.',                     group: 'Variety', target: 25 },
  { id: 'human_jukebox',     name: 'Human Jukebox',     description: 'Dance 50 unique dances.',                     group: 'Variety', target: 50 },
  { id: 'crowd_favorite',    name: 'Crowd Favorite',    description: 'Repeat the same dance 10 times.',             group: 'Variety', target: 10 },
  { id: 'encore',            name: 'Encore',            description: 'Dance the same dance across 5 different sessions.', group: 'Variety', target: 5 },
  // Social
  { id: 'competitive_spirit', name: 'Competitive Spirit', description: 'Join 10 Showdown Sessions.',                         group: 'Social', target: 10 },
  { id: 'showdown_winner',    name: 'Showdown Winner',    description: 'Win your first challenge.',                           group: 'Social', target: 1  },
  { id: 'rivalry',            name: 'Rivalry',            description: 'Compete in 5 challenges.',                           group: 'Social', target: 5  },
  { id: 'undefeated',         name: 'Undefeated',         description: 'Win 3 challenges in a row.',                         group: 'Social', target: 3  },
  { id: 'main_character',     name: 'Main Character',     description: 'Finish first in a challenge with 30+ dances logged.', group: 'Social', target: 1 },
  // Hidden
  { id: 'marathon_night',     name: 'Marathon Night',     description: 'Log 25 dances in one session.',              group: 'Hidden', target: 25 },
  { id: 'closing_time',       name: 'Closing Time',       description: 'Log a session after 1 AM.',                  group: 'Hidden', target: 1  },
  { id: 'night_owl',          name: 'Night Owl',          description: 'Log 3 sessions after midnight.',              group: 'Hidden', target: 3  },
  { id: 'back_in_the_saddle', name: 'Back in the Saddle', description: 'Start a new streak after missing 7+ days.', group: 'Hidden', target: 1  },
  { id: 'floor_hopper',       name: 'Floor Hopper',       description: 'Dance at 3 different venues in a single week.', group: 'Hidden', target: 1 },
];

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
  'Milestones', 'Consistency', 'Exploration', 'Variety', 'Social', 'Hidden',
];
