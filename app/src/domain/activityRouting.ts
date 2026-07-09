import type { ActivityTemplate } from './types'

export type ActivityRoute =
  | 'action-match'
  | 'category-baskets'
  | 'feature-find'
  | 'parent-led'
  | 'photo-point'
  | 'put-it-somewhere'
  | 'question-picnic'
  | 'story-snaps'

const routeByActivityId: Record<string, ActivityRoute> = {
  'act.action_match.v1': 'action-match',
  'act.category_baskets.v1': 'category-baskets',
  'act.find_the_feature.v1': 'feature-find',
  'act.photo_point.v1': 'photo-point',
  'act.print_spotting.v1': 'parent-led',
  'act.put_it_somewhere.v1': 'put-it-somewhere',
  'act.question_picnic.v1': 'question-picnic',
  'act.silly_mix_up.v1': 'parent-led',
  'act.sound_play_parade.v1': 'parent-led',
  'act.story_snaps.v1': 'story-snaps',
  'act.tiny_treasure_hunt.v1': 'parent-led',
  'act.why_because_seed.v1': 'parent-led',
}

const routeByActivityType: Record<string, ActivityRoute> = {
  parent_led_direction: 'parent-led',
  parent_led_print_walk: 'parent-led',
  parent_led_question: 'parent-led',
  parent_led_silly_error: 'parent-led',
  parent_led_sound_play: 'parent-led',
  photo_choice: 'photo-point',
  photo_question: 'question-picnic',
  photo_sequence_talk: 'story-snaps',
  sort_into_bins: 'category-baskets',
}

export function routeForActivity(activity: Pick<ActivityTemplate, 'activity_type' | 'id'> | undefined): ActivityRoute {
  if (!activity) return 'photo-point'
  return routeByActivityId[activity.id] ?? routeByActivityType[activity.activity_type] ?? 'photo-point'
}
