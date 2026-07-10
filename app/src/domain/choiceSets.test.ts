import { describe, expect, it } from 'vitest'
import { defaultAssets } from './assets'
import { correctChoiceIndex, makeChoiceSetWithTarget } from './choiceSets'

describe('choice set randomization', () => {
  it('keeps the target in the choices without forcing it into the first slot', () => {
    const target = defaultAssets[0]
    const choices = makeChoiceSetWithTarget(defaultAssets, target, 0, 4, 12345, defaultAssets)

    expect(choices).toHaveLength(4)
    expect(correctChoiceIndex(choices, target)).toBeGreaterThan(0)
  })

  it('varies the target position across rounds with a stable seed', () => {
    const positions = Array.from({ length: 12 }, (_, round) => {
      const target = defaultAssets[round % defaultAssets.length]
      const choices = makeChoiceSetWithTarget(defaultAssets, target, round, 4, 12345, defaultAssets)
      return correctChoiceIndex(choices, target)
    })

    expect(new Set(positions).size).toBeGreaterThan(2)
    expect(positions.every((position) => position >= 0 && position < 4)).toBe(true)
  })
})
