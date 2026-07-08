import { learnerFromSimulation } from './mastery'
import { recommendNextActivities } from './recommendations'
import type { ContentPackage, SimulationResult } from './types'

export function runSimulationSuite(content: ContentPackage): SimulationResult[] {
  return content.simulation_profiles.map((profile) => {
    const learner = learnerFromSimulation(content, profile)
    const recommendations = recommendNextActivities(content, learner, 8)
    const recommendedSkillIds = recommendations.map((recommendation) => recommendation.skill_id)
    const recommendedActivityIds = recommendations.map((recommendation) => recommendation.activity_id)
    const notes: string[] = []

    const expectedFrontierHit = (profile.expected_frontier ?? []).some((skillId) => recommendedSkillIds.includes(skillId))
    if (profile.expected_frontier?.length) {
      notes.push(
        expectedFrontierHit
          ? `Matched expected frontier: ${profile.expected_frontier.filter((id) => recommendedSkillIds.includes(id)).join(', ')}`
          : `Missing expected frontier from top recommendations: ${profile.expected_frontier.join(', ')}`,
      )
    }

    const expectedActivityHit = profile.expected_activity ? recommendedActivityIds.includes(profile.expected_activity) : true
    if (profile.expected_activity) {
      notes.push(
        expectedActivityHit
          ? `Matched expected activity ${profile.expected_activity}.`
          : `Expected activity ${profile.expected_activity} was not selected.`,
      )
    }

    const invariantPassed = invariantCheck(profile.id, recommendedSkillIds, recommendations)
    notes.push(invariantPassed.note)

    return {
      profile_id: profile.id,
      description: profile.description,
      recommendations,
      passed: expectedFrontierHit && expectedActivityHit && invariantPassed.passed,
      notes,
    }
  })
}

function invariantCheck(
  profileId: string,
  skillIds: string[],
  recommendations: SimulationResult['recommendations'],
): { passed: boolean; note: string } {
  if (profileId.includes('early_letters')) {
    const passed = !skillIds.includes('phonics.simple_decoding.v1')
    return {
      passed,
      note: passed ? 'Invariant passed: letter names did not unlock phonics.' : 'Invariant failed: phonics was recommended.',
    }
  }

  if (profileId.includes('screen_only')) {
    const passed = recommendations.some((recommendation) => recommendation.kind === 'generalization')
    return {
      passed,
      note: passed
        ? 'Invariant passed: screen-only success redirected to generalization.'
        : 'Invariant failed: no generalization recommendation.',
    }
  }

  if (profileId.includes('older_preschool')) {
    const passed =
      skillIds.includes('soundplay.beginning_sound_noticing.v1') || skillIds.includes('print.letter_sound_links.v1')
    return {
      passed,
      note: passed
        ? 'Invariant passed: older preschool profile can reach sound/letter-sound frontier.'
        : 'Invariant failed: sound/letter-sound frontier missing.',
    }
  }

  const noPhonics = !skillIds.includes('phonics.simple_decoding.v1')
  return {
    passed: noPhonics,
    note: noPhonics ? 'Invariant passed: no premature phonics.' : 'Invariant failed: premature phonics recommended.',
  }
}
