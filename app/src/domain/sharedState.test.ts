import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadGitHubJsonFile,
  normalizeGitHubSyncSettings,
  saveGitHubJsonFile,
  type GitHubSyncSettings,
} from './sharedState'

const settings: GitHubSyncSettings = {
  branch: 'main',
  enabled: true,
  owner: 'troyshu',
  path: '/app-data//state.json/',
  repo: 'toddler-language-atlas',
  token: 'gh-token',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('GitHub sync settings', () => {
  it('normalizes repo settings and state path', () => {
    expect(normalizeGitHubSyncSettings(settings)).toMatchObject({
      branch: 'main',
      owner: 'troyshu',
      path: 'app-data/state.json',
      repo: 'toddler-language-atlas',
    })
  })
})

describe('GitHub JSON file client', () => {
  it('loads a source-controlled JSON state file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        content: btoa(JSON.stringify({ count: 3 })),
        encoding: 'base64',
        sha: 'abc123',
        type: 'file',
      }),
      ok: true,
      status: 200,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadGitHubJsonFile<{ count: number }>(settings)).resolves.toEqual({
      sha: 'abc123',
      value: { count: 3 },
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://api.github.com/repos/troyshu/toddler-language-atlas/contents/app-data/state.json?ref=main',
    )
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer gh-token',
      'X-GitHub-Api-Version': '2026-03-10',
    })
  })

  it('returns null when the state file does not exist yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    )

    await expect(loadGitHubJsonFile(settings)).resolves.toBeNull()
  })

  it('creates or updates the source-controlled JSON state file', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        content: {
          sha: 'def456',
        },
      }),
      ok: true,
      status: 200,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(saveGitHubJsonFile(settings, { count: 4 }, 'abc123')).resolves.toBe('def456')
    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)

    expect(url).toBe('https://api.github.com/repos/troyshu/toddler-language-atlas/contents/app-data/state.json')
    expect(init.method).toBe('PUT')
    expect(init.headers).toMatchObject({
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer gh-token',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2026-03-10',
    })
    expect(body).toMatchObject({
      branch: 'main',
      content: btoa(`${JSON.stringify({ count: 4 }, null, 2)}\n`),
      sha: 'abc123',
    })
    expect(body.message).toContain('Update Toddler Language Atlas state')
  })
})
