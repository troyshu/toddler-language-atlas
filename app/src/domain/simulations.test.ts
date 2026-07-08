import { describe, expect, it } from 'vitest'
import { content } from './content'
import { runSimulationSuite } from './simulations'

describe('learner simulations', () => {
  it('passes prerequisite-aware next-step checks for every MVP profile', () => {
    const results = runSimulationSuite(content)
    expect(results).toHaveLength(6)
    expect(results.filter((result) => !result.passed)).toEqual([])
  })
})
