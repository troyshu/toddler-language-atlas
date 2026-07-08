import { seedAssetData } from './seedAssetData'
import type { AssetItem } from './types'

function seedImagePath(fileName: string): string {
  return `${import.meta.env.BASE_URL}seed-images/${fileName}`
}

export const defaultAssets: AssetItem[] = seedAssetData.map((asset) => ({
  id: asset.id,
  label: asset.label,
  tags: [...asset.tags],
  categories: [...asset.categories],
  phonemeTargets: [...asset.phonemeTargets],
  activityEligibility: [...asset.activityEligibility],
  kind: 'image',
  value: seedImagePath(asset.fileName),
  source: { ...asset.source },
}))
