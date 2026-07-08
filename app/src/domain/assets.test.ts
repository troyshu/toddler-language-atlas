/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultAssets } from './assets'
import { seedAssetData } from './seedAssetData'

const seedImageDirectory = path.resolve(process.cwd(), 'public', 'seed-images')
const metadataPath = path.join(seedImageDirectory, 'metadata.json')

function seedFileNameFor(value: string): string {
  const marker = '/seed-images/'
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return ''
  return value.slice(markerIndex + marker.length)
}

describe('seed assets', () => {
  it('ships a bounded real-image starter pack', () => {
    expect(defaultAssets.length).toBeGreaterThanOrEqual(30)
    expect(defaultAssets.length).toBeLessThanOrEqual(50)
    expect(seedAssetData).toHaveLength(defaultAssets.length)
    expect(defaultAssets.every((asset) => asset.kind === 'image')).toBe(true)
  })

  it('has unique ids and image files that exist in public assets', () => {
    const ids = new Set(defaultAssets.map((asset) => asset.id))
    const fileNames = new Set(defaultAssets.map((asset) => seedFileNameFor(asset.value)))

    expect(ids.size).toBe(defaultAssets.length)
    expect(fileNames.size).toBe(defaultAssets.length)
    for (const fileName of fileNames) {
      expect(fileName).not.toBe('')
      expect(existsSync(path.join(seedImageDirectory, fileName))).toBe(true)
    }
  })

  it('stores source metadata for each bundled image', () => {
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as typeof seedAssetData
    expect(metadata).toHaveLength(defaultAssets.length)

    for (const asset of defaultAssets) {
      expect(asset.source?.provider).toBe('Wikimedia Commons')
      expect(asset.source?.sourceUrl).toContain('commons.wikimedia.org')
      expect(asset.source?.retrievedAt).toBe('2026-07-08')
      expect(asset.source?.license).toMatch(/CC0|Public domain|PD-/i)
    }
  })

  it('covers the major early-language asset families', () => {
    const categories = new Set(defaultAssets.flatMap((asset) => asset.categories ?? []))
    for (const category of ['action', 'animal', 'body', 'clothing', 'familiar_object', 'food', 'toy', 'vehicle']) {
      expect(categories.has(category)).toBe(true)
    }
    expect(defaultAssets.filter((asset) => asset.activityEligibility?.includes('spatial_prompt'))).toHaveLength(9)
    expect(defaultAssets.filter((asset) => asset.activityEligibility?.includes('action_label')).length).toBeGreaterThanOrEqual(5)
    expect(defaultAssets.filter((asset) => asset.categories?.includes('food') || asset.tags.includes('food')).length).toBeGreaterThanOrEqual(8)
  })
})
