import { describe, expect, it } from 'vitest'
import { content } from './content'
import { createDemoLearner, makeObservation, recordObservation } from './mastery'

describe('mastery transitions', () => {
  it('caps screen-only success below mastery', () => {
    const learner = createDemoLearner(content)
    const observation = makeObservation({
      learnerId: learner.learner_id,
      skillIds: ['concept.categories.basic.v1'],
      activityId: 'act.category_baskets.v1',
      response: 'independent',
      promptLevel: 'P0_independent',
      source: 'app_probe',
      generalization: false,
      notes: 'Selected food photo from app choices.',
    })

    const next = recordObservation(content, learner, observation)
    expect(next.skill_states['concept.categories.basic.v1'].current_state).toBe('independent_in_activity')
    expect(next.skill_states['concept.categories.basic.v1'].current_state).not.toBe('mastered')
  })

  it('gives real-world observations generalization credit', () => {
    const learner = createDemoLearner(content)
    const observation = makeObservation({
      learnerId: learner.learner_id,
      skillIds: ['concept.prepositions.in_on_under.v1'],
      activityId: 'act.put_it_somewhere.v1',
      response: 'prompted',
      promptLevel: 'P2_repeat',
      source: 'real_world',
      generalization: true,
      notes: 'Put bear under chair during cleanup.',
    })

    const next = recordObservation(content, learner, observation)
    expect(next.skill_states['concept.prepositions.in_on_under.v1'].current_state).toBe('generalizing')
    expect(next.skill_states['concept.prepositions.in_on_under.v1'].generalization_score).toBeGreaterThan(0.3)
  })
})
