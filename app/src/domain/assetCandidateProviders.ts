import type { AssetReplacementCandidate } from './assetReview'

export interface AssetCandidateProvider {
  id: string
  label: string
  search: (query: string, limit?: number) => Promise<AssetReplacementCandidate[]>
}

export interface AssetCandidateSearchOptions {
  includeOpenSources?: boolean
  pexelsApiKey?: string
  pixabayApiKey?: string
}

interface WikimediaPage {
  imageinfo?: Array<{
    descriptionurl?: string
    extmetadata?: {
      Artist?: { value?: string }
      Credit?: { value?: string }
      ImageDescription?: { value?: string }
      LicenseShortName?: { value?: string }
    }
    mime?: string
    thumburl?: string
    url?: string
  }>
  title?: string
}

interface WikimediaResponse {
  query?: {
    pages?: WikimediaPage[]
  }
}

interface OpenverseResult {
  creator?: string | null
  foreign_landing_url?: string | null
  id?: string
  license?: string | null
  source?: string | null
  thumbnail?: string | null
  title?: string | null
  url?: string | null
}

interface OpenverseResponse {
  results?: OpenverseResult[]
}

interface PexelsPhoto {
  alt?: string | null
  height?: number
  id?: number
  photographer?: string
  photographer_url?: string
  src?: {
    large?: string
    large2x?: string
    medium?: string
    original?: string
    small?: string
  }
  url?: string
  width?: number
}

interface PexelsResponse {
  photos?: PexelsPhoto[]
}

interface PixabayHit {
  id?: number
  imageHeight?: number
  imageWidth?: number
  largeImageURL?: string
  pageURL?: string
  previewURL?: string
  tags?: string
  user?: string
  webformatURL?: string
}

interface PixabayResponse {
  hits?: PixabayHit[]
}

const safeLicensePattern = /^(CC0|Public domain|PDM|PD[- ]?US)$/i
const artifactPattern =
  /\b(ancient|antique|archaeological|artifact|artefact|coin|excavation|fossil|historic|manuscript|museum|neolithic|painting|pottery|relic|ruin|sarcophagus|sculpture|statue|terracotta|vintage)\b/i
const illustrationPattern = /\b(cartoon|clipart|drawing|icon|illustration|render|svg|vector)\b/i
const queryStopWords = new Set([
  'animal',
  'animals',
  'clear',
  'everyday',
  'food',
  'image',
  'isolated',
  'modern',
  'object',
  'photo',
  'photograph',
  'photography',
  'picture',
  'real',
  'stock',
  'vehicle',
  'vehicles',
])

export const candidateProviders: AssetCandidateProvider[] = [
  {
    id: 'wikimedia',
    label: 'Wikimedia Commons',
    search: searchWikimediaCommons,
  },
  {
    id: 'openverse',
    label: 'Openverse',
    search: searchOpenverse,
  },
]

export function buildCandidateProviders(options: AssetCandidateSearchOptions = {}): AssetCandidateProvider[] {
  const providers: AssetCandidateProvider[] = []
  const pexelsApiKey = options.pexelsApiKey?.trim()
  const pixabayApiKey = options.pixabayApiKey?.trim()

  if (pexelsApiKey) {
    providers.push({
      id: 'pexels',
      label: 'Pexels',
      search: (query, limit) => searchPexels(query, limit, pexelsApiKey),
    })
  }

  if (pixabayApiKey) {
    providers.push({
      id: 'pixabay',
      label: 'Pixabay',
      search: (query, limit) => searchPixabay(query, limit, pixabayApiKey),
    })
  }

  if (options.includeOpenSources ?? true) {
    providers.push(...candidateProviders)
  }

  return providers
}

export async function searchAssetCandidates(
  query: string,
  limit = 12,
  options: AssetCandidateSearchOptions = {},
): Promise<AssetReplacementCandidate[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []
  const providers = buildCandidateProviders(options)
  if (providers.length === 0) {
    throw new Error('Add a Pexels or Pixabay API key, or enable fallback image sources.')
  }

  const providerLimit = Math.max(8, Math.ceil(limit / providers.length) + 4)
  const settled = await Promise.allSettled(providers.map((provider) => provider.search(trimmedQuery, providerLimit)))
  const candidates = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  if (candidates.length === 0 && settled.some((result) => result.status === 'rejected')) {
    const errors = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => (result.reason instanceof Error ? result.reason.message : 'Image source failed.'))
    throw new Error(errors.join(' '))
  }
  return rankAndFilterAssetCandidates(candidates, trimmedQuery).slice(0, limit)
}

export async function searchPexels(
  query: string,
  limit = 8,
  apiKey: string | undefined,
): Promise<AssetReplacementCandidate[]> {
  const key = apiKey?.trim()
  if (!key) throw new Error('Pexels API key is missing.')
  const params = new URLSearchParams({
    orientation: 'square',
    per_page: String(Math.min(80, Math.max(limit * 2, 12))),
    query: toModernPhotoQuery(query),
  })
  const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
    headers: {
      Authorization: key,
    },
  })
  if (!response.ok) throw new Error(`Pexels search failed: ${response.status}`)
  return rankAndFilterAssetCandidates(mapPexelsCandidates((await response.json()) as PexelsResponse), query).slice(0, limit)
}

export async function searchPixabay(
  query: string,
  limit = 8,
  apiKey: string | undefined,
): Promise<AssetReplacementCandidate[]> {
  const key = apiKey?.trim()
  if (!key) throw new Error('Pixabay API key is missing.')
  const params = new URLSearchParams({
    image_type: 'photo',
    key,
    order: 'popular',
    per_page: String(Math.min(200, Math.max(limit * 2, 12))),
    q: toPixabayQuery(query),
    safesearch: 'true',
  })
  const response = await fetch(`https://pixabay.com/api/?${params.toString()}`)
  if (!response.ok) throw new Error(`Pixabay search failed: ${response.status}`)
  return rankAndFilterAssetCandidates(mapPixabayCandidates((await response.json()) as PixabayResponse), query).slice(0, limit)
}

export async function searchWikimediaCommons(query: string, limit = 8): Promise<AssetReplacementCandidate[]> {
  const sourceQuery = normalizeAssetSearchQuery(query)
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: String(Math.max(limit * 2, 12)),
    gsrsearch: `${sourceQuery} CC0 photograph`,
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '420',
    origin: '*',
    prop: 'imageinfo',
  })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
  if (!response.ok) throw new Error(`Wikimedia search failed: ${response.status}`)
  return rankAndFilterAssetCandidates(mapWikimediaCandidates((await response.json()) as WikimediaResponse), query).slice(0, limit)
}

export async function searchOpenverse(query: string, limit = 8): Promise<AssetReplacementCandidate[]> {
  const sourceQuery = normalizeAssetSearchQuery(query)
  const params = new URLSearchParams({
    category: 'photograph',
    license: 'cc0,pdm',
    page_size: String(limit),
    q: sourceQuery,
  })
  const response = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`)
  if (!response.ok) throw new Error(`Openverse search failed: ${response.status}`)
  return rankAndFilterAssetCandidates(mapOpenverseCandidates((await response.json()) as OpenverseResponse), query).slice(0, limit)
}

export function mapPexelsCandidates(response: PexelsResponse): AssetReplacementCandidate[] {
  return (response.photos ?? [])
    .map((photo): AssetReplacementCandidate | null => {
      const sourceUrl = photo.url ?? ''
      const thumbnailUrl = photo.src?.medium ?? photo.src?.small ?? photo.src?.large ?? ''
      const downloadUrl = photo.src?.large2x ?? photo.src?.large ?? photo.src?.original ?? thumbnailUrl
      if (!photo.id || !sourceUrl || !thumbnailUrl || !downloadUrl) return null
      return {
        id: `pexels:${photo.id}`,
        provider: 'Pexels',
        title: photo.alt?.trim() || `Pexels photo ${photo.id}`,
        creator: photo.photographer?.trim() ?? '',
        license: 'Pexels License',
        sourceUrl,
        thumbnailUrl,
        downloadUrl,
        mimeType: 'image/jpeg',
      }
    })
    .filter((candidate): candidate is AssetReplacementCandidate => candidate !== null)
}

export function mapPixabayCandidates(response: PixabayResponse): AssetReplacementCandidate[] {
  return (response.hits ?? [])
    .map((hit): AssetReplacementCandidate | null => {
      const sourceUrl = hit.pageURL ?? ''
      const thumbnailUrl = hit.webformatURL ?? hit.previewURL ?? hit.largeImageURL ?? ''
      const downloadUrl = hit.largeImageURL ?? hit.webformatURL ?? ''
      if (!hit.id || !sourceUrl || !thumbnailUrl || !downloadUrl) return null
      return {
        id: `pixabay:${hit.id}`,
        provider: 'Pixabay',
        title: titleFromTags(hit.tags) || `Pixabay photo ${hit.id}`,
        creator: hit.user?.trim() ?? '',
        license: 'Pixabay Content License',
        sourceUrl,
        thumbnailUrl,
        downloadUrl,
        mimeType: 'image/jpeg',
      }
    })
    .filter((candidate): candidate is AssetReplacementCandidate => candidate !== null)
}

export function mapWikimediaCandidates(response: WikimediaResponse): AssetReplacementCandidate[] {
  return (response.query?.pages ?? [])
    .map((page): AssetReplacementCandidate | null => {
      const info = page.imageinfo?.[0]
      const license = cleanHtml(info?.extmetadata?.LicenseShortName?.value ?? '')
      const mimeType = info?.mime ?? ''
      const thumbnailUrl = info?.thumburl ?? info?.url ?? ''
      const downloadUrl = info?.url ?? info?.thumburl ?? ''
      if (!page.title || !info?.descriptionurl || !thumbnailUrl || !downloadUrl) return null
      if (!mimeType.startsWith('image/') || mimeType.includes('svg')) return null
      if (!isSafeLicense(license)) return null
      return {
        id: `wikimedia:${page.title}`,
        provider: 'Wikimedia Commons',
        title: page.title,
        creator: cleanHtml(info.extmetadata?.Artist?.value ?? info.extmetadata?.Credit?.value ?? ''),
        license,
        sourceUrl: info.descriptionurl,
        thumbnailUrl,
        downloadUrl,
        mimeType,
      }
    })
    .filter((candidate): candidate is AssetReplacementCandidate => candidate !== null)
}

export function mapOpenverseCandidates(response: OpenverseResponse): AssetReplacementCandidate[] {
  return (response.results ?? [])
    .map((result) => {
      const license = normalizeOpenverseLicense(result.license ?? '')
      const title = result.title?.trim() ?? ''
      const thumbnailUrl = result.thumbnail ?? ''
      const downloadUrl = result.url ?? ''
      const sourceUrl = result.foreign_landing_url ?? ''
      if (!result.id || !title || !thumbnailUrl || !downloadUrl || !sourceUrl) return null
      if (!isSafeLicense(license)) return null
      return {
        id: `openverse:${result.id}`,
        provider: `Openverse${result.source ? ` / ${result.source}` : ''}`,
        title,
        creator: result.creator?.trim() ?? '',
        license,
        sourceUrl,
        thumbnailUrl,
        downloadUrl,
      }
    })
    .filter((candidate): candidate is AssetReplacementCandidate => candidate !== null)
}

export function rankAndFilterAssetCandidates(
  candidates: AssetReplacementCandidate[],
  query: string,
): AssetReplacementCandidate[] {
  return uniqueCandidates(candidates)
    .filter((candidate) => !hasRejectedTerms(candidate))
    .map((candidate) => ({ candidate, score: scoreCandidate(candidate, query) }))
    .sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title))
    .map(({ candidate }) => candidate)
}

function uniqueCandidates(candidates: AssetReplacementCandidate[]): AssetReplacementCandidate[] {
  const seen = new Set<string>()
  const unique: AssetReplacementCandidate[] = []
  for (const candidate of candidates) {
    const key = candidate.sourceUrl || candidate.downloadUrl
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(candidate)
  }
  return unique
}

function scoreCandidate(candidate: AssetReplacementCandidate, query: string): number {
  const text = candidateText(candidate)
  const provider = candidate.provider.toLowerCase()
  let score = 0

  if (provider.includes('pexels')) score += 70
  if (provider.includes('pixabay')) score += 60
  if (provider.includes('openverse')) score += 10
  if (provider.includes('wikimedia')) score -= 5

  for (const term of queryTerms(query)) {
    if (candidate.title.toLowerCase().includes(term)) score += 18
    else if (text.includes(term)) score += 8
  }

  if (/photo|photograph|pexels|pixabay|stock/i.test(text)) score += 8
  if (/cc0|public domain|pdm/i.test(candidate.license)) score += 4
  return score
}

function hasRejectedTerms(candidate: AssetReplacementCandidate): boolean {
  const text = candidateText(candidate)
  return artifactPattern.test(text) || illustrationPattern.test(text)
}

function candidateText(candidate: AssetReplacementCandidate): string {
  return [candidate.title, candidate.provider, candidate.creator, candidate.license, candidate.sourceUrl].join(' ').toLowerCase()
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !queryStopWords.has(term))
}

function toModernPhotoQuery(query: string): string {
  const normalized = normalizeAssetSearchQuery(query)
  return `${normalized} photo`
}

function toPixabayQuery(query: string): string {
  return normalizeAssetSearchQuery(query)
}

export function normalizeAssetSearchQuery(query: string): string {
  const normalized = query
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && !queryStopWords.has(term))
    .join(' ')
  return normalized || query.replace(/\s+/g, ' ').trim()
}

function titleFromTags(tags: string | undefined): string {
  const tag = tags?.split(',')[0]?.trim()
  if (!tag) return ''
  return tag.replace(/\b\w/g, (character) => character.toUpperCase())
}

function isSafeLicense(license: string): boolean {
  return safeLicensePattern.test(license)
}

function normalizeOpenverseLicense(license: string): string {
  const normalized = license.trim().toLowerCase()
  if (normalized === 'cc0') return 'CC0'
  if (normalized === 'pdm') return 'PDM'
  return license.trim()
}

function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
