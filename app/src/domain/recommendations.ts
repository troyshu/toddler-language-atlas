import { buildSkillIndex, meetsState, stateRank } from './graph'
import type { ActivityTemplate, ContentPackage, LearnerState, Recommendation, SkillNode } from './types'

const nonRecommendedStates = new Set(['mastered', 'blocked', 'deferred'])

export function recommendNextActivities(content: ContentPackage, learner: LearnerState, limit = 6): Recommendation[] {
  const skillIndex = buildSkillIndex(content)
  const candidates: Recommendation[] = []

  for (const skill of content.skills) {
    const current = learner.skill_states[skill.id]
    const state = current?.current_state ?? 'not_seen'
    if (nonRecommendedStates.has(state)) continue
    if (state === 'stale' || state === 'maintenance_due') {
      candidates.push(makeRecommendation(content, skill, 60, 'maintenance', ['Spaced re-check is due.']))
      continue
    }

    if (state === 'independent_in_activity' && (current?.generalization_score ?? 0) < 0.45) {
      candidates.push(
        makeRecommendation(content, skill, 95, 'generalization', [
          'Screen success is present, but real-world generalization is still weak.',
          'Prefer an off-screen parent observation before more identical app trials.',
        ]),
      )
      continue
    }

    const readiness = readinessScore(skill, learner, skillIndex)
    if (readiness < 0.72) continue
    if (!passesAntiDrillRules(skill, learner)) continue

    const domainUse = domainEvidenceCount(learner, skill.domain, content)
    const masteryGap = 1 - (current?.mastery_score ?? 0)
    const generalizationGap = 1 - (current?.generalization_score ?? 0)
    const uncertainty = 1 - (current?.confidence ?? 0)
    const frontierStateBoost = current ? 22 : 0
    const score =
      readiness * 40 +
      masteryGap * 20 +
      uncertainty * 10 +
      generalizationGap * 12 +
      frontierStateBoost +
      Math.max(0, 10 - domainUse * 2) -
      repetitionPenalty(learner, skill)

    candidates.push(
      makeRecommendation(content, skill, score, state === 'not_seen' ? 'exploration' : 'frontier', [
        `${Math.round(readiness * 100)}% prerequisite readiness.`,
        masteryGap > 0.5 ? 'Meaningful mastery gap.' : 'Small stretch from current state.',
        generalizationGap > 0.55 ? 'Needs broader context evidence.' : 'Some generalization evidence exists.',
      ]),
    )
  }

  const sorted = candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate, index, all) => all.findIndex((seen) => seen.skill_id === candidate.skill_id) === index)
  return balanceDomains(sorted, limit)
}

export function frontierSkillIds(content: ContentPackage, learner: LearnerState): string[] {
  return recommendNextActivities(content, learner, 8).map((recommendation) => recommendation.skill_id)
}

function readinessScore(skill: SkillNode, learner: LearnerState, skillIndex: Map<string, SkillNode>): number {
  const hardPrereqs = skill.prerequisites?.hard ?? []
  if (hardPrereqs.length === 0) return 1

  let total = 0
  for (const prereq of hardPrereqs) {
    const prereqState = learner.skill_states[prereq.skill_id]?.current_state
    if (meetsState(prereqState, prereq.min_state)) {
      total += 1
      continue
    }
    const prereqSkill = skillIndex.get(prereq.skill_id)
    if (prereqSkill && learner.skill_states[prereq.skill_id]?.current_state === 'independent_in_activity') {
      total += 0.7
    }
  }
  return total / hardPrereqs.length
}

function passesAntiDrillRules(skill: SkillNode, learner: LearnerState): boolean {
  if (skill.id === 'phonics.simple_decoding.v1') {
    const hasPhoneme = meetsState(learner.skill_states['phonological.phoneme_awareness.v1']?.current_state, 'generalizing')
    const hasLetterSound = meetsState(learner.skill_states['print.letter_sound_links.v1']?.current_state, 'generalizing')
    return hasPhoneme && hasLetterSound
  }
  if (skill.domain === 'phonics') return false
  return true
}

function makeRecommendation(
  content: ContentPackage,
  skill: SkillNode,
  score: number,
  kind: Recommendation['kind'],
  rationale: string[],
): Recommendation {
  const activity = selectActivity(content, skill, kind)
  return {
    skill_id: skill.id,
    skill_title: skill.title,
    domain: skill.domain,
    activity_id: activity.id,
    activity_title: activity.title,
    score,
    kind,
    rationale,
  }
}

function selectActivity(content: ContentPackage, skill: SkillNode, kind: Recommendation['kind']): ActivityTemplate {
  const preferred = preferredActivityId(skill, kind)
  const preferredActivity = content.activities.find((activity) => activity.id === preferred)
  if (preferredActivity) return preferredActivity

  if (kind === 'generalization') {
    const putItSomewhere = content.activities.find((activity) => activity.id === 'act.put_it_somewhere.v1')
    if (putItSomewhere) return putItSomewhere
  }

  const direct =
    content.activities.find((activity) => activity.target_skill_ids.primary?.includes(skill.id)) ??
    content.activities.find((activity) => activity.target_skill_ids.secondary?.includes(skill.id))
  if (direct) return direct

  const fromSkill = skill.activities?.[0]?.activity_id
  const linked = content.activities.find((activity) => activity.id === fromSkill)
  return linked ?? content.activities[0]
}

function preferredActivityId(skill: SkillNode, kind: Recommendation['kind']): string | undefined {
  if (kind === 'generalization') return 'act.put_it_somewhere.v1'
  if (skill.id === 'concept.categories.basic.v1') return 'act.category_baskets.v1'
  if (skill.id === 'concept.prepositions.in_on_under.v1') return 'act.put_it_somewhere.v1'
  if (skill.id === 'narrative.picture_event_seed.v1') return 'act.story_snaps.v1'
  if (skill.domain === 'vocabulary') return 'act.photo_point.v1'
  if (skill.domain === 'sound_play') return 'act.sound_play_parade.v1'
  if (skill.domain === 'early_literacy') return 'act.print_spotting.v1'
  return undefined
}

function domainEvidenceCount(learner: LearnerState, domain: string, content: ContentPackage): number {
  const domainSkills = new Set(content.skills.filter((skill) => skill.domain === domain).map((skill) => skill.id))
  return Object.entries(learner.skill_states).filter(
    ([skillId, state]) => domainSkills.has(skillId) && state.current_state !== 'not_seen',
  ).length
}

function repetitionPenalty(learner: LearnerState, skill: SkillNode): number {
  const current = learner.skill_states[skill.id]
  if (!current) return 0
  if (current.recent_success_rate > 0.9 && stateRank(current.current_state) >= stateRank('generalizing')) return 20
  return 0
}

function balanceDomains(candidates: Recommendation[], limit: number): Recommendation[] {
  const selected: Recommendation[] = []
  const domainCounts = new Map<string, number>()

  for (const candidate of candidates) {
    const count = domainCounts.get(candidate.domain) ?? 0
    const maxForDomain = candidate.kind === 'generalization' ? 3 : 2
    if (count >= maxForDomain) continue
    selected.push(candidate)
    domainCounts.set(candidate.domain, count + 1)
    if (selected.length === limit) return selected
  }

  for (const candidate of candidates) {
    if (selected.some((chosen) => chosen.skill_id === candidate.skill_id)) continue
    selected.push(candidate)
    if (selected.length === limit) return selected
  }

  return selected
}
