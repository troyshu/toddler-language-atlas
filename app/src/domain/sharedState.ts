export interface SharedDatabaseSettings {
  enabled: boolean
  namespace: string
  supabaseAnonKey: string
  supabaseUrl: string
}

export const sharedDatabaseStorageKey = 'tla.sharedDatabase.v1'

export const defaultSharedDatabaseSettings: SharedDatabaseSettings = {
  enabled: Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
  namespace: import.meta.env.VITE_SUPABASE_NAMESPACE ?? 'default',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
}

interface SharedStateRow<T> {
  updated_at?: string
  value: T
}

export function normalizeSharedDatabaseSettings(
  input: Partial<SharedDatabaseSettings> | null | undefined,
): SharedDatabaseSettings {
  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : defaultSharedDatabaseSettings.enabled,
    namespace: cleanNamespace(input?.namespace ?? defaultSharedDatabaseSettings.namespace),
    supabaseAnonKey: typeof input?.supabaseAnonKey === 'string' ? input.supabaseAnonKey : '',
    supabaseUrl: cleanSupabaseUrl(input?.supabaseUrl ?? ''),
  }
}

export function isSharedDatabaseConfigured(settings: SharedDatabaseSettings): boolean {
  const normalized = normalizeSharedDatabaseSettings(settings)
  return Boolean(normalized.enabled && normalized.supabaseUrl && normalized.supabaseAnonKey && normalized.namespace)
}

export function sharedDatabaseFingerprint(settings: SharedDatabaseSettings): string {
  const normalized = normalizeSharedDatabaseSettings(settings)
  return [
    normalized.enabled ? 'on' : 'off',
    normalized.namespace,
    normalized.supabaseUrl,
    normalized.supabaseAnonKey,
  ].join('|')
}

export async function loadSharedValue<T>(settings: SharedDatabaseSettings, key: string): Promise<T | null> {
  const config = normalizeSharedDatabaseSettings(settings)
  if (!isSharedDatabaseConfigured(config)) return null

  const params = new URLSearchParams({
    key: `eq.${key}`,
    limit: '1',
    namespace: `eq.${config.namespace}`,
    select: 'value,updated_at',
  })
  const response = await fetch(`${config.supabaseUrl}/rest/v1/app_state?${params.toString()}`, {
    headers: supabaseHeaders(config),
  })

  if (!response.ok) throw new Error(`Database load failed for ${key}: ${response.status}`)
  const rows = (await response.json()) as Array<SharedStateRow<T>>
  return rows[0]?.value ?? null
}

export async function saveSharedValue<T>(settings: SharedDatabaseSettings, key: string, value: T): Promise<void> {
  const config = normalizeSharedDatabaseSettings(settings)
  if (!isSharedDatabaseConfigured(config)) return

  const params = new URLSearchParams({
    on_conflict: 'namespace,key',
  })
  const response = await fetch(`${config.supabaseUrl}/rest/v1/app_state?${params.toString()}`, {
    body: JSON.stringify({
      key,
      namespace: config.namespace,
      updated_at: new Date().toISOString(),
      value,
    }),
    headers: {
      ...supabaseHeaders(config),
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    method: 'POST',
  })

  if (!response.ok) throw new Error(`Database save failed for ${key}: ${response.status}`)
}

function supabaseHeaders(settings: SharedDatabaseSettings): Record<string, string> {
  return {
    apikey: settings.supabaseAnonKey,
    Authorization: `Bearer ${settings.supabaseAnonKey}`,
  }
}

function cleanSupabaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function cleanNamespace(value: string): string {
  return value.trim() || 'default'
}
