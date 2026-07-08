import { useMemo, useState } from 'react'
import {
  buildAssetReviewManifest,
  mergeReviewState,
  parseAssetReviewManifest,
  reviewStateFromManifest,
  reviewSummary,
  updateReviewRecord,
  type AssetReplacementCandidate,
  type AssetReviewDecision,
  type AssetReviewState,
} from './domain/assetReview'
import { searchAssetCandidates } from './domain/assetCandidateProviders'
import { useLocalStorageState } from './domain/storage'
import type { AssetItem } from './domain/types'

const reviewStorageKey = 'tla.assetReview.v1'

type ReviewFilter = 'all' | AssetReviewDecision

export function AssetReviewPanel({ assets }: { assets: AssetItem[] }) {
  const initialState = useMemo(() => mergeReviewState(assets, undefined), [assets])
  const [savedReviewState, setSavedReviewState] = useLocalStorageState<AssetReviewState>(reviewStorageKey, initialState)
  const reviewState = useMemo(() => mergeReviewState(assets, savedReviewState), [assets, savedReviewState])
  const summary = useMemo(() => reviewSummary(reviewState), [reviewState])
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [candidateQueries, setCandidateQueries] = useState<Record<string, string>>({})
  const [candidateResults, setCandidateResults] = useState<Record<string, AssetReplacementCandidate[]>>({})
  const [searchingAssetId, setSearchingAssetId] = useState<string | null>(null)
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({})
  const [importMessage, setImportMessage] = useState('')

  const visibleAssets = useMemo(() => {
    return assets.filter((asset) => filter === 'all' || reviewState[asset.id]?.decision === filter)
  }, [assets, filter, reviewState])

  function setReviewState(nextState: AssetReviewState) {
    setSavedReviewState(mergeReviewState(assets, nextState))
  }

  function markAsset(assetId: string, decision: AssetReviewDecision) {
    setReviewState(updateReviewRecord(reviewState, assetId, { decision }))
  }

  function updateNotes(assetId: string, notes: string) {
    setReviewState(updateReviewRecord(reviewState, assetId, { notes }))
  }

  function approveCandidate(assetId: string, candidate: AssetReplacementCandidate) {
    setReviewState(
      updateReviewRecord(reviewState, assetId, {
        decision: 'approved_replacement',
        selectedCandidate: candidate,
      }),
    )
  }

  async function findCandidates(asset: AssetItem) {
    const query = candidateQueries[asset.id]?.trim() || asset.label
    setSearchingAssetId(asset.id)
    setSearchErrors((current) => ({ ...current, [asset.id]: '' }))
    try {
      const results = await searchAssetCandidates(query, 12)
      setCandidateResults((current) => ({ ...current, [asset.id]: results }))
      if (results.length === 0) {
        setSearchErrors((current) => ({ ...current, [asset.id]: 'No license-safe candidates found.' }))
      }
    } catch (error) {
      setSearchErrors((current) => ({
        ...current,
        [asset.id]: error instanceof Error ? error.message : 'Candidate search failed.',
      }))
    } finally {
      setSearchingAssetId(null)
    }
  }

  function exportManifest() {
    const manifest = buildAssetReviewManifest(reviewState, assets)
    const blob = new Blob([`${JSON.stringify(manifest, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `toddler-language-atlas-asset-review-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importManifest(file: File) {
    try {
      const parsedJson = JSON.parse(await file.text()) as unknown
      const parsed = parseAssetReviewManifest(
        parsedJson,
        assets.map((asset) => asset.id),
      )
      if (!parsed.manifest) {
        setImportMessage(parsed.errors.join(' '))
        return
      }
      setReviewState(reviewStateFromManifest(parsed.manifest, assets))
      setImportMessage(`Imported ${parsed.manifest.reviews.length} review records.`)
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <section className="asset-review-shell">
      <div className="asset-review-toolbar">
        <div>
          <p className="eyebrow">Parent Admin</p>
          <h2>Asset Review</h2>
        </div>
        <div className="asset-review-actions">
          <button type="button" onClick={exportManifest}>
            Export Manifest
          </button>
          <label className="file-button">
            Import Manifest
            <input
              accept="application/json"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importManifest(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
        </div>
      </div>

      <div className="review-summary-row">
        <ReviewMetric label="Total" value={summary.total.toString()} />
        <ReviewMetric label="Keep" value={summary.keep.toString()} />
        <ReviewMetric label="Needs" value={summary.needsReplacement.toString()} />
        <ReviewMetric label="Approved" value={summary.approvedReplacement.toString()} />
        <ReviewMetric label="Open" value={summary.unreviewed.toString()} />
      </div>

      <div className="review-filter-row" aria-label="Review filter">
        {(['all', 'unreviewed', 'keep', 'needs_replacement', 'approved_replacement'] as ReviewFilter[]).map((option) => (
          <button className={filter === option ? 'active' : ''} key={option} type="button" onClick={() => setFilter(option)}>
            {formatReviewLabel(option)}
          </button>
        ))}
      </div>

      {importMessage && <p className="review-message">{importMessage}</p>}

      <div className="asset-review-list">
        {visibleAssets.map((asset) => {
          const record = reviewState[asset.id]
          const results = candidateResults[asset.id] ?? []
          return (
            <article className="asset-review-card" key={asset.id}>
              <div className="review-current">
                <img alt={asset.label} src={asset.value} />
                <div>
                  <p className={`pill ${reviewPillClass(record.decision)}`}>{formatReviewLabel(record.decision)}</p>
                  <h3>{asset.label}</h3>
                  <p>{asset.id}</p>
                </div>
              </div>

              <div className="review-metadata-grid">
                <MetadataItem label="Categories" value={(asset.categories ?? []).join(', ')} />
                <MetadataItem label="Tags" value={asset.tags.join(', ')} />
                <MetadataItem label="Phonemes" value={(asset.phonemeTargets ?? []).join(', ')} />
                <MetadataItem label="Activities" value={(asset.activityEligibility ?? []).join(', ')} />
                <MetadataItem label="License" value={asset.source?.license ?? ''} />
                <MetadataItem label="Creator" value={asset.source?.creator ?? ''} />
              </div>

              {asset.source && (
                <a className="source-link" href={asset.source.sourceUrl} rel="noreferrer" target="_blank">
                  Source: {asset.source.title}
                </a>
              )}

              <div className="review-decision-row">
                <button className={record.decision === 'keep' ? 'active' : ''} type="button" onClick={() => markAsset(asset.id, 'keep')}>
                  Keep
                </button>
                <button
                  className={record.decision === 'needs_replacement' ? 'active' : ''}
                  type="button"
                  onClick={() => markAsset(asset.id, 'needs_replacement')}
                >
                  Needs Replacement
                </button>
                <button type="button" className="quiet-button" onClick={() => markAsset(asset.id, 'unreviewed')}>
                  Clear
                </button>
              </div>

              <textarea
                aria-label={`${asset.label} review notes`}
                onChange={(event) => updateNotes(asset.id, event.target.value)}
                placeholder="Notes"
                value={record.notes}
              />

              {record.selectedCandidate && (
                <div className="approved-candidate">
                  <img alt="" src={record.selectedCandidate.thumbnailUrl} />
                  <div>
                    <p className="eyebrow">Approved Replacement</p>
                    <strong>{record.selectedCandidate.title}</strong>
                    <span>{record.selectedCandidate.license}</span>
                  </div>
                </div>
              )}

              <div className="candidate-search-row">
                <input
                  aria-label={`${asset.label} candidate query`}
                  onChange={(event) => setCandidateQueries((current) => ({ ...current, [asset.id]: event.target.value }))}
                  placeholder={asset.label}
                  value={candidateQueries[asset.id] ?? ''}
                />
                <button type="button" onClick={() => void findCandidates(asset)}>
                  {searchingAssetId === asset.id ? 'Searching' : 'Find Candidates'}
                </button>
              </div>

              {searchErrors[asset.id] && <p className="review-error">{searchErrors[asset.id]}</p>}

              {results.length > 0 && (
                <div className="candidate-grid">
                  {results.map((candidate) => (
                    <CandidateCard
                      candidate={candidate}
                      key={candidate.id}
                      onApprove={() => approveCandidate(asset.id, candidate)}
                      selected={record.selectedCandidate?.id === candidate.id}
                    />
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CandidateCard({
  candidate,
  onApprove,
  selected,
}: {
  candidate: AssetReplacementCandidate
  onApprove: () => void
  selected: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <div className={selected ? 'candidate-card selected' : 'candidate-card'}>
      {imageFailed ? (
        <div className="candidate-image-fallback">No Preview</div>
      ) : (
        <img alt="" onError={() => setImageFailed(true)} src={candidate.thumbnailUrl} />
      )}
      <div>
        <strong>{candidate.title}</strong>
        <span>{candidate.provider}</span>
        <span>{candidate.license}</span>
        {candidate.creator && <span>{candidate.creator}</span>}
        <a href={candidate.sourceUrl} rel="noreferrer" target="_blank">
          Source
        </a>
      </div>
      <button type="button" onClick={onApprove}>
        Approve
      </button>
    </div>
  )
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || 'None'}</strong>
    </div>
  )
}

function formatReviewLabel(value: ReviewFilter): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function reviewPillClass(decision: AssetReviewDecision): string {
  if (decision === 'keep') return 'passed'
  if (decision === 'needs_replacement') return 'maintenance'
  if (decision === 'approved_replacement') return 'generalization'
  return 'exploration'
}
