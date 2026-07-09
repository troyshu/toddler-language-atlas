import { describe, expect, it } from 'vitest'
import { routeForActivity } from './activityRouting'

describe('activity routing', () => {
  it('routes known MVP activity ids to distinct screens', () => {
    expect(routeForActivity({ id: 'act.action_match.v1', activity_type: 'photo_choice' })).toBe('action-match')
    expect(routeForActivity({ id: 'act.category_baskets.v1', activity_type: 'sort_into_bins' })).toBe('category-baskets')
    expect(routeForActivity({ id: 'act.question_picnic.v1', activity_type: 'photo_question' })).toBe('question-picnic')
    expect(routeForActivity({ id: 'act.story_snaps.v1', activity_type: 'photo_sequence_talk' })).toBe('story-snaps')
  })

  it('uses activity type fallbacks for future templates', () => {
    expect(routeForActivity({ id: 'act.future_sort.v1', activity_type: 'sort_into_bins' })).toBe('category-baskets')
    expect(routeForActivity({ id: 'act.future_parent.v1', activity_type: 'parent_led_question' })).toBe('parent-led')
    expect(routeForActivity({ id: 'act.future_photo.v1', activity_type: 'photo_choice' })).toBe('photo-point')
  })
})
