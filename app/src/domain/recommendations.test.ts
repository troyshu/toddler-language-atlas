import { describe, expect, it } from 'vitest'
import { content } from './content'
import { validateGraph } from './graph'
import { learnerFromSimulation } from './mastery'
import { recommendNextActivities } from './recommendations'

describe('recommendation engine', () => {
  it('validates the hard prerequisite graph', () => {
    const result = validateGraph(content)
    expect(result.valid).toBe(true)
    expect(result.missingPrerequisites).toEqual([])
    expect(result.cycles).toEqual([])
  })

  it('does not unlock phonics from letter knowledge alone', () => {
    const profile = content.simulation_profiles.find((candidate) => candidate.id === 'sim.early_letters_weak_oral')
    expect(profile).toBeDefined()
    const learner = learnerFromSimulation(content, profile!)
    const recommendations = recommendNextActivities(content, learner, 8)
    const skillIds = recommendations.map((recommendation) => recommendation.skill_id)
    expect(skillIds).not.toContain('phonics.simple_decoding.v1')
    expect(skillIds).toEqual(expect.arrayContaining(['soundplay.rhyme_exposure.v1']))
  })

  it('redirects screen-only success toward generalization', () => {
    const profile = content.simulation_profiles.find((candidate) => candidate.id === 'sim.screen_only_success')
    expect(profile).toBeDefined()
    const learner = learnerFromSimulation(content, profile!)
    const recommendations = recommendNextActivities(content, learner, 5)
    expect(recommendations[0].kind).toBe('generalization')
    expect(recommendations[0].skill_id).toBe('vocab.familiar_nouns.v1')
  })

  it('finds prepositions as a frontier for advanced vocabulary with weak spatial language', () => {
    const profile = content.simulation_profiles.find((candidate) => candidate.id === 'sim.advanced_vocab_weak_prepositions')
    expect(profile).toBeDefined()
    const learner = learnerFromSimulation(content, profile!)
    const recommendations = recommendNextActivities(content, learner, 8)
    expect(recommendations.map((recommendation) => recommendation.skill_id)).toContain(
      'concept.prepositions.in_on_under.v1',
    )
  })
})
