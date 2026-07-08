import type { AssetReplacementCandidate } from './assetReview'

export interface AssetCandidateProvider {
  id: string
  label: string
  search: (query: string, limit?: number) => Promise<AssetReplacementCandidate[]>
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

const safeLicensePattern = /^(CC0|Public domain|PDM|PD[- ]?US)$/i

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

export async function searchAssetCandidates(query: string, limit = 12): Promise<AssetReplacementCandidate[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []
  const providerLimit = Math.max(4, Math.ceil(limit / candidateProviders.length))
  const settled = await Promise.allSettled(candidateProviders.map((provider) => provider.search(trimmedQuery, providerLimit)))
  const candidates = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  return uniqueCandidates(candidates).slice(0, limit)
}

export async function searchWikimediaCommons(query: string, limit = 8): Promise<AssetReplacementCandidate[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: String(Math.max(limit * 2, 12)),
    gsrsearch: `${query} CC0 photograph`,
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '420',
    origin: '*',
    prop: 'imageinfo',
  })
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
  if (!response.ok) throw new Error(`Wikimedia search failed: ${response.status}`)
  return mapWikimediaCandidates((await response.json()) as WikimediaResponse).slice(0, limit)
}

export async function searchOpenverse(query: string, limit = 8): Promise<AssetReplacementCandidate[]> {
  const params = new URLSearchParams({
    category: 'photograph',
    license: 'cc0,pdm',
    page_size: String(limit),
    q: query,
  })
  const response = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`)
  if (!response.ok) throw new Error(`Openverse search failed: ${response.status}`)
  return mapOpenverseCandidates((await response.json()) as OpenverseResponse).slice(0, limit)
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
