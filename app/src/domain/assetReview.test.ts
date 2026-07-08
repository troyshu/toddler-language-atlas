import { describe, expect, it } from 'vitest'
import { defaultAssets } from './assets'
import {
  buildAssetReviewManifest,
  mergeReviewState,
  parseAssetReviewManifest,
  reviewStateFromManifest,
  updateReviewRecord,
  type AssetReplacementCandidate,
} from './assetReview'
import {
  mapOpenverseCandidates,
  mapPexelsCandidates,
  mapPixabayCandidates,
  mapWikimediaCandidates,
  rankAndFilterAssetCandidates,
} from './assetCandidateProviders'

const candidate: AssetReplacementCandidate = {
  id: 'wikimedia:File:Better cup.jpg',
  provider: 'Wikimedia Commons',
  title: 'File:Better cup.jpg',
  creator: 'Photographer',
  license: 'CC0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Better_cup.jpg',
  thumbnailUrl: 'https://upload.wikimedia.org/thumb.jpg',
  downloadUrl: 'https://upload.wikimedia.org/full.jpg',
  mimeType: 'image/jpeg',
}

describe('asset review manifests', () => {
  it('builds, parses, and restores review state', () => {
    const initialState = mergeReviewState(defaultAssets, undefined)
    const state = updateReviewRecord(initialState, defaultAssets[0].id, {
      decision: 'approved_replacement',
      notes: 'Clearer cup.',
      selectedCandidate: candidate,
    })
    const manifest = buildAssetReviewManifest(state, defaultAssets)
    const parsed = parseAssetReviewManifest(manifest, defaultAssets.map((asset) => asset.id))

    expect(parsed.errors).toEqual([])
    expect(parsed.manifest?.reviews).toHaveLength(defaultAssets.length)
    expect(reviewStateFromManifest(parsed.manifest!, defaultAssets)[defaultAssets[0].id].selectedCandidate).toEqual(candidate)
  })

  it('rejects unknown assets and approved replacements without candidates', () => {
    const parsed = parseAssetReviewManifest(
      {
        schemaVersion: 'asset-review.v1',
        project: 'Toddler Language Atlas',
        exportedAt: new Date().toISOString(),
        reviews: [
          {
            assetId: 'asset.unknown',
            decision: 'approved_replacement',
            notes: '',
          },
        ],
      },
      defaultAssets.map((asset) => asset.id),
    )

    expect(parsed.manifest).toBeUndefined()
    expect(parsed.errors.some((error) => error.includes('not a bundled seed asset'))).toBe(true)
    expect(parsed.errors.some((error) => error.includes('selectedCandidate is required'))).toBe(true)
  })

  it('drops stale review records when merging against current bundled assets', () => {
    const state = mergeReviewState(defaultAssets, {
      [defaultAssets[0].id]: {
        assetId: defaultAssets[0].id,
        decision: 'keep',
        notes: 'Works well.',
      },
      'asset.old': {
        assetId: 'asset.old',
        decision: 'needs_replacement',
        notes: 'Old asset.',
      },
    })

    expect(Object.keys(state)).toHaveLength(defaultAssets.length)
    expect(state[defaultAssets[0].id].decision).toBe('keep')
    expect(state['asset.old']).toBeUndefined()
  })
})

describe('asset candidate provider mapping', () => {
  it('maps Pexels candidates', () => {
    const candidates = mapPexelsCandidates({
      photos: [
        {
          alt: 'Child holding a red cup',
          id: 42,
          photographer: 'Modern Photographer',
          src: {
            large: 'https://images.pexels.com/photos/42/large.jpeg',
            large2x: 'https://images.pexels.com/photos/42/large2x.jpeg',
            medium: 'https://images.pexels.com/photos/42/medium.jpeg',
          },
          url: 'https://www.pexels.com/photo/cup-42/',
        },
      ],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      creator: 'Modern Photographer',
      license: 'Pexels License',
      provider: 'Pexels',
      title: 'Child holding a red cup',
    })
  })

  it('maps Pixabay candidates', () => {
    const candidates = mapPixabayCandidates({
      hits: [
        {
          id: 88,
          largeImageURL: 'https://pixabay.com/get/cup-large.jpg',
          pageURL: 'https://pixabay.com/photos/cup-88/',
          previewURL: 'https://cdn.pixabay.com/cup-preview.jpg',
          tags: 'cup, coffee, drink',
          user: 'Pixabay Photographer',
          webformatURL: 'https://cdn.pixabay.com/cup-web.jpg',
        },
      ],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      creator: 'Pixabay Photographer',
      license: 'Pixabay Content License',
      provider: 'Pixabay',
      title: 'Cup',
    })
  })

  it('maps and filters Wikimedia Commons candidates', () => {
    const candidates = mapWikimediaCandidates({
      query: {
        pages: [
          {
            title: 'File:Good cup.jpg',
            imageinfo: [
              {
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:Good_cup.jpg',
                extmetadata: {
                  Artist: { value: '<span>Creator</span>' },
                  LicenseShortName: { value: 'CC0' },
                },
                mime: 'image/jpeg',
                thumburl: 'https://upload.wikimedia.org/thumb.jpg',
                url: 'https://upload.wikimedia.org/full.jpg',
              },
            ],
          },
          {
            title: 'File:Unsafe license.jpg',
            imageinfo: [
              {
                descriptionurl: 'https://commons.wikimedia.org/wiki/File:Unsafe_license.jpg',
                extmetadata: {
                  LicenseShortName: { value: 'CC BY-SA 4.0' },
                },
                mime: 'image/jpeg',
                thumburl: 'https://upload.wikimedia.org/unsafe-thumb.jpg',
                url: 'https://upload.wikimedia.org/unsafe-full.jpg',
              },
            ],
          },
        ],
      },
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      creator: 'Creator',
      license: 'CC0',
      provider: 'Wikimedia Commons',
      title: 'File:Good cup.jpg',
    })
  })

  it('maps and filters Openverse candidates', () => {
    const candidates = mapOpenverseCandidates({
      results: [
        {
          creator: 'Creator',
          foreign_landing_url: 'https://stocksnap.io/photo/cup',
          id: 'abc',
          license: 'cc0',
          source: 'stocksnap',
          thumbnail: 'https://api.openverse.org/thumb',
          title: 'Cup',
          url: 'https://cdn.example.com/cup.jpg',
        },
        {
          creator: 'Creator',
          foreign_landing_url: 'https://example.com/by',
          id: 'def',
          license: 'by',
          source: 'example',
          thumbnail: 'https://api.openverse.org/by-thumb',
          title: 'Licensed cup',
          url: 'https://cdn.example.com/by.jpg',
        },
      ],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      license: 'CC0',
      provider: 'Openverse / stocksnap',
      title: 'Cup',
    })
  })

  it('ranks modern photos ahead of public-domain fallbacks and filters artifact terms', () => {
    const ranked = rankAndFilterAssetCandidates(
      [
        {
          ...candidate,
          id: 'wikimedia:File:Ancient cup artifact.jpg',
          provider: 'Wikimedia Commons',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ancient_cup_artifact.jpg',
          title: 'File:Ancient cup artifact.jpg',
        },
        {
          ...candidate,
          id: 'pexels:42',
          provider: 'Pexels',
          license: 'Pexels License',
          sourceUrl: 'https://www.pexels.com/photo/cup-42/',
          title: 'Child holding a red cup',
        },
        {
          ...candidate,
          id: 'openverse:cup',
          provider: 'Openverse / stocksnap',
          sourceUrl: 'https://stocksnap.io/photo/cup',
          title: 'Cup on a table',
        },
      ],
      'cup everyday object photo',
    )

    expect(ranked.map((item) => item.id)).toEqual(['pexels:42', 'openverse:cup'])
  })
})
