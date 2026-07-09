import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  loadSharedValue,
  normalizeSharedDatabaseSettings,
  saveSharedValue,
  type SharedDatabaseSettings,
} from './sharedState'

const settings: SharedDatabaseSettings = {
  enabled: true,
  namespace: 'home',
  supabaseAnonKey: 'anon-key',
  supabaseUrl: 'https://example.supabase.co/',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('shared database settings', () => {
  it('normalizes namespace and Supabase URL', () => {
    expect(normalizeSharedDatabaseSettings(settings)).toMatchObject({
      namespace: 'home',
      supabaseUrl: 'https://example.supabase.co',
    })
    expect(normalizeSharedDatabaseSettings({ enabled: true }).namespace).toBe('default')
  })
})

describe('shared value REST client', () => {
  it('loads a value from the app_state table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => [{ value: { count: 3 } }],
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadSharedValue(settings, 'learner')).resolves.toEqual({ count: 3 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://example.supabase.co/rest/v1/app_state?')
    expect(url).toContain('namespace=eq.home')
    expect(url).toContain('key=eq.learner')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer anon-key',
      apikey: 'anon-key',
    })
  })

  it('upserts a value into the app_state table', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
    })
    vi.stubGlobal('fetch', fetchMock)

    await saveSharedValue(settings, 'assets', [{ id: 'asset.cup' }])
    const [url, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body)

    expect(url).toBe('https://example.supabase.co/rest/v1/app_state?on_conflict=namespace%2Ckey')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer anon-key',
      Prefer: 'resolution=merge-duplicates,return=minimal',
      apikey: 'anon-key',
    })
    expect(body).toMatchObject({
      key: 'assets',
      namespace: 'home',
      value: [{ id: 'asset.cup' }],
    })
  })
})
