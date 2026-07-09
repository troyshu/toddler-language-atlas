export interface GitHubSyncSettings {
  branch: string
  enabled: boolean
  owner: string
  path: string
  repo: string
  token: string
}

export const githubSyncStorageKey = 'tla.githubSync.v1'

export const defaultGitHubSyncSettings: GitHubSyncSettings = {
  branch: import.meta.env.VITE_GITHUB_SYNC_BRANCH ?? 'main',
  enabled: Boolean(import.meta.env.VITE_GITHUB_SYNC_TOKEN),
  owner: import.meta.env.VITE_GITHUB_SYNC_OWNER ?? 'troyshu',
  path: import.meta.env.VITE_GITHUB_SYNC_PATH ?? 'app-data/state.json',
  repo: import.meta.env.VITE_GITHUB_SYNC_REPO ?? 'toddler-language-atlas',
  token: import.meta.env.VITE_GITHUB_SYNC_TOKEN ?? '',
}

export interface GitHubContentFile<T> {
  sha: string
  value: T
}

interface GitHubContentResponse {
  content?: string
  encoding?: string
  message?: string
  sha?: string
  type?: string
}

interface GitHubUpdateResponse {
  content?: {
    sha?: string
  } | null
}

export function normalizeGitHubSyncSettings(input: Partial<GitHubSyncSettings> | null | undefined): GitHubSyncSettings {
  return {
    branch: cleanInput(input?.branch ?? defaultGitHubSyncSettings.branch),
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : defaultGitHubSyncSettings.enabled,
    owner: cleanInput(input?.owner ?? defaultGitHubSyncSettings.owner),
    path: cleanPath(input?.path ?? defaultGitHubSyncSettings.path),
    repo: cleanInput(input?.repo ?? defaultGitHubSyncSettings.repo),
    token: typeof input?.token === 'string' ? input.token.trim() : '',
  }
}

export function isGitHubSyncConfigured(settings: GitHubSyncSettings): boolean {
  const normalized = normalizeGitHubSyncSettings(settings)
  return Boolean(
    normalized.enabled &&
      normalized.owner &&
      normalized.repo &&
      normalized.branch &&
      normalized.path &&
      normalized.token,
  )
}

export function githubSyncFingerprint(settings: GitHubSyncSettings): string {
  const normalized = normalizeGitHubSyncSettings(settings)
  return [
    normalized.enabled ? 'on' : 'off',
    normalized.owner,
    normalized.repo,
    normalized.branch,
    normalized.path,
    normalized.token,
  ].join('|')
}

export async function loadGitHubJsonFile<T>(settings: GitHubSyncSettings): Promise<GitHubContentFile<T> | null> {
  const config = normalizeGitHubSyncSettings(settings)
  if (!isGitHubSyncConfigured(config)) return null

  const params = new URLSearchParams({ ref: config.branch })
  const response = await fetch(`${githubContentsUrl(config)}?${params.toString()}`, {
    headers: githubHeaders(config),
  })

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub load failed: ${response.status}`)

  const payload = (await response.json()) as GitHubContentResponse
  if (payload.type !== 'file' || payload.encoding !== 'base64' || !payload.content || !payload.sha) {
    throw new Error('GitHub state file is not a base64 JSON file.')
  }

  return {
    sha: payload.sha,
    value: JSON.parse(decodeBase64(payload.content)) as T,
  }
}

export async function saveGitHubJsonFile<T>(
  settings: GitHubSyncSettings,
  value: T,
  sha?: string,
): Promise<string> {
  const config = normalizeGitHubSyncSettings(settings)
  if (!isGitHubSyncConfigured(config)) throw new Error('GitHub sync is not configured.')

  const response = await fetch(githubContentsUrl(config), {
    body: JSON.stringify({
      branch: config.branch,
      content: encodeBase64(`${JSON.stringify(value, null, 2)}\n`),
      message: `Update Toddler Language Atlas state ${new Date().toISOString()}`,
      sha,
    }),
    headers: {
      ...githubHeaders(config),
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  })

  if (response.status === 409) throw new Error('GitHub save conflict. Pull latest, then try again.')
  if (!response.ok) throw new Error(`GitHub save failed: ${response.status}`)

  const payload = (await response.json()) as GitHubUpdateResponse
  const nextSha = payload.content?.sha
  if (!nextSha) throw new Error('GitHub save did not return a file SHA.')
  return nextSha
}

function githubContentsUrl(settings: GitHubSyncSettings): string {
  return `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(
    settings.repo,
  )}/contents/${encodePath(settings.path)}`
}

function githubHeaders(settings: GitHubSyncSettings): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${settings.token}`,
    'X-GitHub-Api-Version': '2026-03-10',
  }
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

function cleanInput(value: string): string {
  return value.trim()
}

function cleanPath(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/{2,}/g, '/')
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize))
  }
  return btoa(binary)
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s+/g, ''))
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
