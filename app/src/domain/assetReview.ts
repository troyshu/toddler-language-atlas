import type { AssetItem } from './types'

export type AssetReviewDecision = 'unreviewed' | 'keep' | 'needs_replacement' | 'approved_replacement'

export interface AssetReplacementCandidate {
  id: string
  provider: string
  title: string
  creator: string
  license: string
  sourceUrl: string
  thumbnailUrl: string
  downloadUrl: string
  mimeType?: string
}

export interface AssetReviewRecord {
  assetId: string
  decision: AssetReviewDecision
  notes: string
  selectedCandidate?: AssetReplacementCandidate
  updatedAt?: string
}

export type AssetReviewState = Record<string, AssetReviewRecord>

export interface AssetReviewManifest {
  schemaVersion: 'asset-review.v1'
  project: 'Toddler Language Atlas'
  exportedAt: string
  reviews: AssetReviewRecord[]
}

const reviewDecisions: AssetReviewDecision[] = ['unreviewed', 'keep', 'needs_replacement', 'approved_replacement']

export function createEmptyReviewRecord(assetId: string): AssetReviewRecord {
  return {
    assetId,
    decision: 'unreviewed',
    notes: '',
  }
}

export function mergeReviewState(assets: AssetItem[], savedState: AssetReviewState | null | undefined): AssetReviewState {
  const merged: AssetReviewState = {}
  for (const asset of assets) {
    const saved = savedState?.[asset.id]
    merged[asset.id] = saved ? normalizeReviewRecord(saved, asset.id) : createEmptyReviewRecord(asset.id)
  }
  return merged
}

export function updateReviewRecord(
  state: AssetReviewState,
  assetId: string,
  patch: Partial<Omit<AssetReviewRecord, 'assetId'>>,
): AssetReviewState {
  const current = state[assetId] ?? createEmptyReviewRecord(assetId)
  const next: AssetReviewRecord = {
    ...current,
    ...patch,
    assetId,
    updatedAt: new Date().toISOString(),
  }
  if (next.decision !== 'approved_replacement') {
    delete next.selectedCandidate
  }
  return {
    ...state,
    [assetId]: next,
  }
}

export function buildAssetReviewManifest(state: AssetReviewState, assets: AssetItem[]): AssetReviewManifest {
  return {
    schemaVersion: 'asset-review.v1',
    project: 'Toddler Language Atlas',
    exportedAt: new Date().toISOString(),
    reviews: assets.map((asset) => state[asset.id] ?? createEmptyReviewRecord(asset.id)),
  }
}

export function parseAssetReviewManifest(
  input: unknown,
  validAssetIds: readonly string[],
): { manifest?: AssetReviewManifest; errors: string[] } {
  const errors: string[] = []
  const validIds = new Set(validAssetIds)

  if (!isRecord(input)) return { errors: ['Manifest must be a JSON object.'] }
  if (input.schemaVersion !== 'asset-review.v1') errors.push('schemaVersion must be asset-review.v1.')
  if (input.project !== 'Toddler Language Atlas') errors.push('project must be Toddler Language Atlas.')
  if (typeof input.exportedAt !== 'string') errors.push('exportedAt must be a string.')
  if (!Array.isArray(input.reviews)) errors.push('reviews must be an array.')

  if (errors.length > 0 || !Array.isArray(input.reviews)) return { errors }

  const seenIds = new Set<string>()
  const reviews: AssetReviewRecord[] = []
  input.reviews.forEach((review, index) => {
    if (!isRecord(review)) {
      errors.push(`reviews[${index}] must be an object.`)
      return
    }
    const assetId = typeof review.assetId === 'string' ? review.assetId : ''
    if (!assetId) errors.push(`reviews[${index}].assetId must be a string.`)
    if (assetId && !validIds.has(assetId)) errors.push(`reviews[${index}].assetId is not a bundled seed asset: ${assetId}.`)
    if (assetId && seenIds.has(assetId)) errors.push(`reviews[${index}].assetId is duplicated: ${assetId}.`)
    seenIds.add(assetId)

    const decision = review.decision
    if (!reviewDecisions.includes(decision as AssetReviewDecision)) {
      errors.push(`reviews[${index}].decision is invalid.`)
    }

    const selectedCandidate = normalizeCandidate(review.selectedCandidate)
    if (decision === 'approved_replacement' && !selectedCandidate) {
      errors.push(`reviews[${index}].selectedCandidate is required for an approved replacement.`)
    }

    reviews.push({
      assetId,
      decision: reviewDecisions.includes(decision as AssetReviewDecision) ? (decision as AssetReviewDecision) : 'unreviewed',
      notes: typeof review.notes === 'string' ? review.notes : '',
      selectedCandidate,
      updatedAt: typeof review.updatedAt === 'string' ? review.updatedAt : undefined,
    })
  })

  if (errors.length > 0) return { errors }
  return {
    manifest: {
      schemaVersion: 'asset-review.v1',
      project: 'Toddler Language Atlas',
      exportedAt: input.exportedAt as string,
      reviews,
    },
    errors: [],
  }
}

export function reviewStateFromManifest(manifest: AssetReviewManifest, assets: AssetItem[]): AssetReviewState {
  const byId = Object.fromEntries(manifest.reviews.map((review) => [review.assetId, review]))
  return mergeReviewState(assets, byId)
}

export function reviewSummary(state: AssetReviewState): {
  approvedReplacement: number
  keep: number
  needsReplacement: number
  total: number
  unreviewed: number
} {
  const records = Object.values(state)
  return {
    approvedReplacement: records.filter((record) => record.decision === 'approved_replacement').length,
    keep: records.filter((record) => record.decision === 'keep').length,
    needsReplacement: records.filter((record) => record.decision === 'needs_replacement').length,
    total: records.length,
    unreviewed: records.filter((record) => record.decision === 'unreviewed').length,
  }
}

function normalizeReviewRecord(input: AssetReviewRecord, assetId: string): AssetReviewRecord {
  const decision = reviewDecisions.includes(input.decision) ? input.decision : 'unreviewed'
  const selectedCandidate = decision === 'approved_replacement' ? normalizeCandidate(input.selectedCandidate) : undefined
  return {
    assetId,
    decision,
    notes: typeof input.notes === 'string' ? input.notes : '',
    selectedCandidate,
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
  }
}

function normalizeCandidate(input: unknown): AssetReplacementCandidate | undefined {
  if (!isRecord(input)) return undefined
  const candidate = {
    id: readString(input.id),
    provider: readString(input.provider),
    title: readString(input.title),
    creator: readString(input.creator),
    license: readString(input.license),
    sourceUrl: readString(input.sourceUrl),
    thumbnailUrl: readString(input.thumbnailUrl),
    downloadUrl: readString(input.downloadUrl),
    mimeType: typeof input.mimeType === 'string' ? input.mimeType : undefined,
  }
  if (
    !candidate.id ||
    !candidate.provider ||
    !candidate.title ||
    !candidate.license ||
    !candidate.sourceUrl ||
    !candidate.thumbnailUrl ||
    !candidate.downloadUrl
  ) {
    return undefined
  }
  return candidate
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
