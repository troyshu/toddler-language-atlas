import type { AssetItem } from './types'

export function randomChoiceSeed(): number {
  return Math.floor(Math.random() * 0xffffffff)
}

export function makeChoiceSetWithTarget(
  assets: Array<AssetItem | undefined>,
  target: AssetItem | undefined,
  round: number,
  size: number,
  seed: number,
  fallbackAssets: AssetItem[] = [],
): AssetItem[] {
  const uniqueAssets = uniqueAssetList(assets)
  const safeTarget = target ?? uniqueAssets[0] ?? fallbackAssets[0]
  if (!safeTarget) return uniqueAssets.slice(0, size)

  const distractorPool = seededShuffle(
    uniqueAssetList([...uniqueAssets, ...fallbackAssets]).filter((asset) => asset.id !== safeTarget.id),
    seed + round * 7919 + 17,
  )
  const distractors = distractorPool.slice(0, Math.max(0, size - 1))
  const finalSize = Math.min(size, distractors.length + 1)
  let targetSlot = finalSize <= 1 ? 0 : randomIndex(seed + round * 104729 + 31, finalSize)

  if (round === 0 && targetSlot === 0 && finalSize > 1) {
    targetSlot = 1 + randomIndex(seed + 53, finalSize - 1)
  }

  return [...distractors.slice(0, targetSlot), safeTarget, ...distractors.slice(targetSlot)].slice(0, size)
}

export function correctChoiceIndex(choices: AssetItem[], target: AssetItem): number {
  return choices.findIndex((choice) => choice.id === target.id)
}

function uniqueAssetList(assets: Array<AssetItem | undefined>): AssetItem[] {
  const seen = new Set<string>()
  const unique: AssetItem[] = []
  for (const asset of assets) {
    if (!asset || seen.has(asset.id)) continue
    seen.add(asset.id)
    unique.push(asset)
  }
  return unique
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const shuffled = [...items]
  const random = seededRandom(seed)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

function randomIndex(seed: number, size: number): number {
  if (size <= 0) return 0
  return Math.floor(seededRandom(seed)() * size)
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
