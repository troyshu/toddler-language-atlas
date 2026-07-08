import type { ContentPackage, MasteryState, SkillNode } from './types'

export const masteryOrder: MasteryState[] = [
  'not_seen',
  'introduced',
  'emerging_receptive',
  'emerging_expressive',
  'assisted_success',
  'independent_in_activity',
  'generalizing',
  'mastered',
  'maintenance_due',
  'stale',
  'regressed',
  'blocked',
  'deferred',
]

const stateRanks = new Map<MasteryState, number>(masteryOrder.map((state, index) => [state, index]))

export function stateRank(state: MasteryState | undefined): number {
  if (!state) return 0
  return stateRanks.get(state) ?? 0
}

export function meetsState(actual: MasteryState | undefined, minimum: MasteryState): boolean {
  if (!actual) return false
  if (actual === 'maintenance_due') return stateRank('mastered') >= stateRank(minimum)
  if (actual === 'stale' || actual === 'regressed' || actual === 'blocked' || actual === 'deferred') return false
  return stateRank(actual) >= stateRank(minimum)
}

export function buildSkillIndex(content: ContentPackage): Map<string, SkillNode> {
  return new Map(content.skills.map((skill) => [skill.id, skill]))
}

export function validateGraph(content: ContentPackage): {
  valid: boolean
  missingPrerequisites: string[]
  cycles: string[][]
} {
  const skillIds = new Set(content.skills.map((skill) => skill.id))
  const missingPrerequisites: string[] = []
  for (const skill of content.skills) {
    for (const prereq of skill.prerequisites?.hard ?? []) {
      if (!skillIds.has(prereq.skill_id)) {
        missingPrerequisites.push(`${skill.id} -> ${prereq.skill_id}`)
      }
    }
  }

  const cycles: string[][] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()

  function visit(skillId: string, path: string[]) {
    if (visiting.has(skillId)) {
      const start = path.indexOf(skillId)
      cycles.push([...path.slice(start), skillId])
      return
    }
    if (visited.has(skillId)) return
    visiting.add(skillId)
    const skill = content.skills.find((candidate) => candidate.id === skillId)
    for (const prereq of skill?.prerequisites?.hard ?? []) {
      visit(prereq.skill_id, [...path, skillId])
    }
    visiting.delete(skillId)
    visited.add(skillId)
  }

  for (const skill of content.skills) {
    visit(skill.id, [])
  }

  return {
    valid: missingPrerequisites.length === 0 && cycles.length === 0,
    missingPrerequisites,
    cycles,
  }
}

export function domainCoverage(content: ContentPackage, skillStates: Record<string, { current_state: MasteryState }>) {
  const domains = new Map<string, { total: number; active: number; mastered: number }>()
  for (const skill of content.skills) {
    const bucket = domains.get(skill.domain) ?? { total: 0, active: 0, mastered: 0 }
    bucket.total += 1
    const state = skillStates[skill.id]?.current_state ?? 'not_seen'
    if (state !== 'not_seen' && state !== 'deferred') bucket.active += 1
    if (state === 'mastered' || state === 'generalizing' || state === 'maintenance_due') bucket.mastered += 1
    domains.set(skill.domain, bucket)
  }
  return [...domains.entries()].map(([domain, counts]) => ({ domain, ...counts }))
}
