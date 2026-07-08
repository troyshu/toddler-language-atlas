import { describe, expect, it } from 'vitest'
import { content } from './content'
import { buildDependencyEdges, buildGraphModel, validateGraph } from './graph'
import type { ContentPackage } from './types'

describe('skill graph validation', () => {
  it('derives explicit hard and soft prerequisite edge records', () => {
    const edges = buildDependencyEdges(content)
    expect(edges.length).toBeGreaterThan(0)
    expect(edges.some((edge) => edge.strength === 'hard' && edge.reason.length > 0)).toBe(true)
    expect(edges.some((edge) => edge.strength === 'soft' && edge.reason.length > 0)).toBe(true)
  })

  it('builds separate graph nodes and edges from the current schema', () => {
    const graph = buildGraphModel(content)
    expect(graph.nodes.length).toBe(content.skills.length)
    expect(graph.edges.every((edge) => edge.topicId !== edge.prerequisiteId)).toBe(true)
  })

  it('validates current content references and anti-drill invariants', () => {
    const result = validateGraph(content)
    expect(result).toMatchObject({
      valid: true,
      missingPrerequisites: [],
      missingRelatedSkillReferences: [],
      missingActivityReferences: [],
      selfDependencies: [],
      cycles: [],
      antiDrillViolations: [],
    })
  })

  it('detects missing prerequisite and activity references', () => {
    const broken: ContentPackage = structuredClone(content)
    broken.skills[0].prerequisites = {
      hard: [{ skill_id: 'missing.skill.v1', min_state: 'introduced', rationale: 'test' }],
      soft: [],
      anti_prerequisites: [],
    }
    broken.activities[0].target_skill_ids.primary = ['missing.activity.skill.v1']

    const result = validateGraph(broken)
    expect(result.valid).toBe(false)
    expect(result.missingPrerequisites).toEqual([`${broken.skills[0].id} -> missing.skill.v1`])
    expect(result.missingActivityReferences).toContain(`${broken.activities[0].id} -> missing.activity.skill.v1`)
  })

  it('detects hard cycles', () => {
    const cyclic: ContentPackage = structuredClone(content)
    cyclic.skills[0].prerequisites = {
      hard: [{ skill_id: cyclic.skills[1].id, min_state: 'introduced', rationale: 'test' }],
      soft: [],
      anti_prerequisites: [],
    }
    cyclic.skills[1].prerequisites = {
      hard: [{ skill_id: cyclic.skills[0].id, min_state: 'introduced', rationale: 'test' }],
      soft: [],
      anti_prerequisites: [],
    }

    const result = validateGraph(cyclic)
    expect(result.valid).toBe(false)
    expect(result.cycles.length).toBeGreaterThan(0)
  })

  it('detects premature phonics unlocks from letter names alone', () => {
    const broken: ContentPackage = structuredClone(content)
    const phonics = broken.skills.find((skill) => skill.id === 'phonics.simple_decoding.v1')
    expect(phonics).toBeDefined()
    phonics!.prerequisites = {
      hard: [{ skill_id: 'print.letter_names.v1', min_state: 'mastered', rationale: 'bad gate' }],
      soft: [],
      anti_prerequisites: [],
    }

    const result = validateGraph(broken)
    expect(result.valid).toBe(false)
    expect(result.antiDrillViolations).toEqual(
      expect.arrayContaining([
        'print.letter_names.v1 must not directly unlock phonics.simple_decoding.v1',
        'phonics.simple_decoding.v1 must require phonological.phoneme_awareness.v1',
        'phonics.simple_decoding.v1 must require print.letter_sound_links.v1',
      ]),
    )
  })
})
