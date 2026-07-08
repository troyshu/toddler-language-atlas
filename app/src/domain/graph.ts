import type { ContentPackage, MasteryState, SkillNode } from './types'

export interface SkillGraphNode {
  id: string
  name: string
  domain: string
  track: string
  ageBand: string
  evidenceCount: number
  activityIds: string[]
}

export interface DependencyEdge {
  id: string
  topicId: string
  prerequisiteId: string
  strength: 'hard' | 'soft'
  reason: string
}

export interface SkillGraphModel {
  nodes: SkillGraphNode[]
  edges: DependencyEdge[]
}

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

export function buildGraphModel(content: ContentPackage): SkillGraphModel {
  return {
    nodes: content.skills.map((skill) => ({
      id: skill.id,
      name: skill.title,
      domain: skill.domain,
      track: skill.track,
      ageBand: skill.age_band,
      evidenceCount: skill.evidence_notes?.do_not_drill?.length ?? 0,
      activityIds: skill.activities?.map((activity) => activity.activity_id) ?? [],
    })),
    edges: buildDependencyEdges(content),
  }
}

export function buildDependencyEdges(content: ContentPackage): DependencyEdge[] {
  const edges: DependencyEdge[] = []
  for (const skill of content.skills) {
    for (const prereq of skill.prerequisites?.hard ?? []) {
      edges.push({
        id: `${prereq.skill_id}->${skill.id}:hard`,
        topicId: skill.id,
        prerequisiteId: prereq.skill_id,
        strength: 'hard',
        reason: prereq.rationale ?? 'Hard prerequisite.',
      })
    }
    for (const prereq of skill.prerequisites?.soft ?? []) {
      edges.push({
        id: `${prereq.skill_id}->${skill.id}:soft`,
        topicId: skill.id,
        prerequisiteId: prereq.skill_id,
        strength: 'soft',
        reason: prereq.rationale ?? 'Soft prerequisite.',
      })
    }
  }
  return edges
}

export function prerequisitesFor(content: ContentPackage, skillId: string): DependencyEdge[] {
  return buildDependencyEdges(content).filter((edge) => edge.topicId === skillId)
}

export function unlocksFor(content: ContentPackage, skillId: string): DependencyEdge[] {
  return buildDependencyEdges(content).filter((edge) => edge.prerequisiteId === skillId)
}

export function validateGraph(content: ContentPackage): {
  valid: boolean
  missingPrerequisites: string[]
  missingRelatedSkillReferences: string[]
  missingActivityReferences: string[]
  selfDependencies: string[]
  cycles: string[][]
  antiDrillViolations: string[]
} {
  const skillIds = new Set(content.skills.map((skill) => skill.id))
  const activityIds = new Set(content.activities.map((activity) => activity.id))
  const missingPrerequisites: string[] = []
  const missingRelatedSkillReferences: string[] = []
  const missingActivityReferences: string[] = []
  const selfDependencies: string[] = []
  const antiDrillViolations: string[] = []

  for (const skill of content.skills) {
    for (const prereq of [...(skill.prerequisites?.hard ?? []), ...(skill.prerequisites?.soft ?? [])]) {
      if (!skillIds.has(prereq.skill_id)) {
        missingPrerequisites.push(`${skill.id} -> ${prereq.skill_id}`)
      }
      if (prereq.skill_id === skill.id) {
        selfDependencies.push(skill.id)
      }
    }
    for (const relatedId of flattenRelatedSkillIds(skill)) {
      if (!skillIds.has(relatedId)) {
        missingRelatedSkillReferences.push(`${skill.id} -> ${relatedId}`)
      }
    }
    for (const coPracticeRef of skill.related_skills?.co_practice ?? []) {
      const refSet = coPracticeRef.startsWith('act.') ? activityIds : skillIds
      if (!refSet.has(coPracticeRef)) {
        missingActivityReferences.push(`${skill.id} -> ${coPracticeRef}`)
      }
    }
    for (const activityRef of skill.activities ?? []) {
      if (!activityIds.has(activityRef.activity_id)) {
        missingActivityReferences.push(`${skill.id} -> ${activityRef.activity_id}`)
      }
    }
  }

  for (const activity of content.activities) {
    for (const skillId of [...(activity.target_skill_ids.primary ?? []), ...(activity.target_skill_ids.secondary ?? [])]) {
      if (!skillIds.has(skillId)) {
        missingActivityReferences.push(`${activity.id} -> ${skillId}`)
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

  const phonics = content.skills.find((skill) => skill.id === 'phonics.simple_decoding.v1')
  const phonicsHardPrereqs = new Set(phonics?.prerequisites?.hard?.map((prereq) => prereq.skill_id) ?? [])
  if (phonicsHardPrereqs.has('print.letter_names.v1')) {
    antiDrillViolations.push('print.letter_names.v1 must not directly unlock phonics.simple_decoding.v1')
  }
  if (phonics && !phonicsHardPrereqs.has('phonological.phoneme_awareness.v1')) {
    antiDrillViolations.push('phonics.simple_decoding.v1 must require phonological.phoneme_awareness.v1')
  }
  if (phonics && !phonicsHardPrereqs.has('print.letter_sound_links.v1')) {
    antiDrillViolations.push('phonics.simple_decoding.v1 must require print.letter_sound_links.v1')
  }

  return {
    valid:
      missingPrerequisites.length === 0 &&
      missingRelatedSkillReferences.length === 0 &&
      missingActivityReferences.length === 0 &&
      selfDependencies.length === 0 &&
      cycles.length === 0 &&
      antiDrillViolations.length === 0,
    missingPrerequisites,
    missingRelatedSkillReferences,
    missingActivityReferences,
    selfDependencies,
    cycles,
    antiDrillViolations,
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

function flattenRelatedSkillIds(skill: SkillNode): string[] {
  const related = skill.related_skills
  if (!related) return []
  return [
    ...(related.supports ?? []),
    ...(related.transfer_to ?? []),
    ...(related.contrasts_with ?? []),
    ...(related.not_a_prerequisite ?? []),
  ]
}
