import type { AssetItem } from './types'

export interface AssetSearchProfile {
  boostTerms: string[]
  query: string
  rejectTerms: string[]
}

const baseRejectTerms = [
  'ancient',
  'antique',
  'artifact',
  'cartoon',
  'clipart',
  'drawing',
  'fashion',
  'illustration',
  'logo',
  'museum',
  'painting',
  'person wearing',
  'sculpture',
  'statue',
  'vector',
  'vintage',
]

const profilesByLabel: Record<string, Partial<AssetSearchProfile>> = {
  airplane: { query: 'toy airplane isolated white background', boostTerms: ['airplane', 'toy airplane'] },
  apple: { query: 'single red apple isolated white background', boostTerms: ['apple'] },
  ball: { query: 'single ball isolated white background', boostTerms: ['ball'] },
  banana: { query: 'single banana isolated white background', boostTerms: ['banana'] },
  bear: { query: 'teddy bear toy isolated white background', boostTerms: ['bear', 'teddy bear'] },
  bed: { query: 'child bed isolated room photo', boostTerms: ['bed'] },
  blocks: { query: 'toy blocks isolated white background', boostTerms: ['blocks', 'toy blocks'] },
  book: { query: 'children book isolated white background', boostTerms: ['book'] },
  bowl: { query: 'plain bowl isolated white background', boostTerms: ['bowl'] },
  box: { query: 'cardboard box isolated white background', boostTerms: ['box'] },
  bread: { query: 'slice of bread isolated white background', boostTerms: ['bread'] },
  brush: { query: 'hair brush isolated white background', boostTerms: ['brush'] },
  bus: { query: 'toy bus isolated white background', boostTerms: ['bus'] },
  car: { query: 'toy car isolated white background', boostTerms: ['car'] },
  carrot: { query: 'single carrot isolated white background', boostTerms: ['carrot'] },
  cat: { query: 'domestic cat clear photo', boostTerms: ['cat'] },
  chair: { query: 'simple chair isolated white background', boostTerms: ['chair'] },
  cookie: { query: 'single cookie isolated white background', boostTerms: ['cookie'] },
  cracker: { query: 'single cracker isolated white background', boostTerms: ['cracker'] },
  cup: { query: 'plain cup isolated white background', boostTerms: ['cup'] },
  dog: { query: 'domestic dog clear photo', boostTerms: ['dog'] },
  doll: { query: 'baby doll toy isolated white background', boostTerms: ['doll'] },
  drinking: { query: 'child drinking water clear action photo', boostTerms: ['drinking', 'drink'] },
  duck: { query: 'rubber duck toy isolated white background', boostTerms: ['duck'] },
  hand: { query: 'open hand isolated white background', boostTerms: ['hand'] },
  hat: {
    query: 'baseball cap isolated white background product photo',
    boostTerms: ['hat', 'cap', 'baseball cap'],
    rejectTerms: ['person', 'woman', 'man', 'face', 'fashion model', 'ceremony', 'sombrero crowd'],
  },
  jumping: { query: 'child jumping clear action photo', boostTerms: ['jumping', 'jump'] },
  key: { query: 'single house key isolated white background', boostTerms: ['key'] },
  milk: { query: 'glass of milk isolated white background', boostTerms: ['milk'] },
  phone: { query: 'smartphone isolated white background', boostTerms: ['phone'] },
  plate: { query: 'plain plate isolated white background', boostTerms: ['plate'] },
  reading: { query: 'child reading book clear action photo', boostTerms: ['reading', 'book'] },
  running: { query: 'child running clear action photo', boostTerms: ['running', 'run'] },
  shoe: { query: 'single child shoe isolated white background', boostTerms: ['shoe'] },
  sleeping: { query: 'child sleeping clear action photo', boostTerms: ['sleeping', 'sleep'] },
  sock: { query: 'single sock isolated white background', boostTerms: ['sock'] },
  spoon: { query: 'single spoon isolated white background', boostTerms: ['spoon'] },
  table: { query: 'simple table isolated white background', boostTerms: ['table'] },
  truck: { query: 'toy truck isolated white background', boostTerms: ['truck'] },
  'washing hands': { query: 'child washing hands clear action photo', boostTerms: ['washing hands', 'wash hands'] },
}

export function assetSearchProfile(asset: AssetItem): AssetSearchProfile {
  const normalizedLabel = asset.label.toLowerCase()
  const profile = profilesByLabel[normalizedLabel]
  const fallbackQuery = fallbackProfileQuery(asset)
  return {
    boostTerms: uniqueTerms([asset.label, ...(profile?.boostTerms ?? [])]),
    query: profile?.query ?? fallbackQuery,
    rejectTerms: uniqueTerms([...baseRejectTerms, ...(profile?.rejectTerms ?? [])]),
  }
}

function fallbackProfileQuery(asset: AssetItem): string {
  const label = asset.label.toLowerCase()
  if (asset.tags.includes('action') || asset.categories?.includes('action')) {
    return `child ${label} clear action photo`
  }
  if (asset.tags.includes('animal') || asset.categories?.includes('animal')) return `${label} clear animal photo`
  if (asset.tags.includes('food') || asset.categories?.includes('food')) return `single ${label} isolated white background`
  if (asset.tags.includes('toy') || asset.categories?.includes('toy')) return `toy ${label} isolated white background`
  return `${label} isolated white background product photo`
}

function uniqueTerms(terms: string[]): string[] {
  return [...new Set(terms.map((term) => term.trim().toLowerCase()).filter(Boolean))]
}
