import type { AssetItem } from './types'

export const defaultAssets: AssetItem[] = [
  { id: 'asset.spoon', label: 'spoon', tags: ['object', 'food', 'kitchen'], kind: 'emoji', value: '🥄' },
  { id: 'asset.shoe', label: 'shoe', tags: ['object', 'clothing'], kind: 'emoji', value: '👟' },
  { id: 'asset.dog', label: 'dog', tags: ['animal', 'sound'], kind: 'emoji', value: '🐶' },
  { id: 'asset.car', label: 'car', tags: ['vehicle', 'toy'], kind: 'emoji', value: '🚗' },
  { id: 'asset.apple', label: 'apple', tags: ['food'], kind: 'emoji', value: '🍎' },
  { id: 'asset.hat', label: 'hat', tags: ['clothing'], kind: 'emoji', value: '🧢' },
  { id: 'asset.bear', label: 'bear', tags: ['toy', 'animal'], kind: 'emoji', value: '🧸' },
  { id: 'asset.cup', label: 'cup', tags: ['object', 'kitchen'], kind: 'emoji', value: '🥤' },
]
