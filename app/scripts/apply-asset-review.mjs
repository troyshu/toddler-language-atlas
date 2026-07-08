import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDirectory, '..')
const seedImageDirectory = path.join(appRoot, 'public', 'seed-images')
const metadataPath = path.join(seedImageDirectory, 'metadata.json')
const seedAssetDataPath = path.join(appRoot, 'src', 'domain', 'seedAssetData.ts')

const manifestPath = process.argv[2]

if (!manifestPath) {
  console.error('Usage: npm run apply-asset-review -- path/to/manifest.json')
  process.exit(1)
}

const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'))
const manifest = JSON.parse(await fs.readFile(path.resolve(process.cwd(), manifestPath), 'utf8'))
const errors = validateManifest(manifest, new Set(metadata.map((asset) => asset.id)))

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

const reviewsByAssetId = new Map(manifest.reviews.map((review) => [review.assetId, review]))
let appliedCount = 0

for (const asset of metadata) {
  const review = reviewsByAssetId.get(asset.id)
  if (review?.decision !== 'approved_replacement') continue

  const candidate = review.selectedCandidate
  const response = await fetch(candidate.downloadUrl, {
    headers: {
      'User-Agent': 'ToddlerLanguageAtlasAssetReview/0.1 (https://github.com/troyshu/toddler-language-atlas)',
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to download ${asset.id}: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? candidate.mimeType ?? ''
  const extension = extensionFor(contentType, candidate.downloadUrl)
  const nextFileName = `${slugify(asset.label)}.${extension}`
  await fs.writeFile(path.join(seedImageDirectory, nextFileName), Buffer.from(await response.arrayBuffer()))

  asset.fileName = nextFileName
  asset.source = {
    provider: candidate.provider,
    title: candidate.title,
    creator: candidate.creator,
    license: candidate.license,
    sourceUrl: candidate.sourceUrl,
    retrievedAt: new Date().toISOString().slice(0, 10),
  }
  appliedCount += 1
  console.log(`Applied ${asset.id}: ${candidate.title}`)
}

validateMetadata(metadata)
await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)
await fs.writeFile(seedAssetDataPath, buildSeedAssetDataSource(metadata))

console.log(`Applied ${appliedCount} approved replacement${appliedCount === 1 ? '' : 's'}.`)

function validateManifest(input, validAssetIds) {
  const errors = []
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Manifest must be a JSON object.']
  if (input.schemaVersion !== 'asset-review.v1') errors.push('schemaVersion must be asset-review.v1.')
  if (input.project !== 'Toddler Language Atlas') errors.push('project must be Toddler Language Atlas.')
  if (!Array.isArray(input.reviews)) errors.push('reviews must be an array.')
  if (!Array.isArray(input.reviews)) return errors

  const seenIds = new Set()
  input.reviews.forEach((review, index) => {
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      errors.push(`reviews[${index}] must be an object.`)
      return
    }
    if (!validAssetIds.has(review.assetId)) errors.push(`reviews[${index}].assetId is not a bundled seed asset: ${review.assetId}.`)
    if (seenIds.has(review.assetId)) errors.push(`reviews[${index}].assetId is duplicated: ${review.assetId}.`)
    seenIds.add(review.assetId)
    if (!['unreviewed', 'keep', 'needs_replacement', 'approved_replacement'].includes(review.decision)) {
      errors.push(`reviews[${index}].decision is invalid.`)
    }
    if (review.decision === 'approved_replacement' && !isCandidate(review.selectedCandidate)) {
      errors.push(`reviews[${index}].selectedCandidate is required for an approved replacement.`)
    }
  })
  return errors
}

function validateMetadata(assets) {
  const ids = new Set()
  const fileNames = new Set()
  for (const asset of assets) {
    if (ids.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}`)
    if (fileNames.has(asset.fileName)) throw new Error(`Duplicate asset fileName: ${asset.fileName}`)
    if (!existsSync(path.join(seedImageDirectory, asset.fileName))) throw new Error(`Missing seed file: ${asset.fileName}`)
    ids.add(asset.id)
    fileNames.add(asset.fileName)
  }
}

function isCandidate(candidate) {
  return (
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.id === 'string' &&
    typeof candidate.provider === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.creator === 'string' &&
    typeof candidate.license === 'string' &&
    typeof candidate.sourceUrl === 'string' &&
    typeof candidate.thumbnailUrl === 'string' &&
    typeof candidate.downloadUrl === 'string'
  )
}

function extensionFor(contentType, url) {
  const normalizedContentType = contentType.toLowerCase()
  if (normalizedContentType.includes('png')) return 'png'
  if (normalizedContentType.includes('webp')) return 'webp'
  if (normalizedContentType.includes('gif')) return 'gif'
  if (/\.(png|webp|gif|jpe?g)(?:$|[?#])/i.test(url)) {
    const match = url.match(/\.(png|webp|gif|jpe?g)(?:$|[?#])/i)
    if (match?.[1].toLowerCase() === 'jpeg') return 'jpg'
    return match?.[1].toLowerCase() ?? 'jpg'
  }
  return 'jpg'
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildSeedAssetDataSource(assets) {
  return `import type { SeedAssetDefinition } from './types'\n\nexport const seedAssetData = ${JSON.stringify(
    assets,
    null,
    2,
  )} as const satisfies readonly SeedAssetDefinition[]\n`
}
