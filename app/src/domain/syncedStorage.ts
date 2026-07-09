import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  isSharedDatabaseConfigured,
  loadSharedValue,
  normalizeSharedDatabaseSettings,
  saveSharedValue,
  type SharedDatabaseSettings,
} from './sharedState'

export interface SyncedStateStatus {
  error: string
  lastSyncedAt: string
  loading: boolean
  remoteEnabled: boolean
}

export function useSyncedLocalStorageState<T>(
  key: string,
  initialValue: T,
  databaseSettings: SharedDatabaseSettings,
): [T, (next: T) => void, SyncedStateStatus, () => Promise<void>] {
  const normalizedSettings = useMemo(() => normalizeSharedDatabaseSettings(databaseSettings), [databaseSettings])
  const remoteEnabled = isSharedDatabaseConfigured(normalizedSettings)
  const [value, setValue] = useState<T>(() => readLocalStorageValue(key, initialValue))
  const latestValueRef = useRef(value)
  const [status, setStatus] = useState<SyncedStateStatus>({
    error: '',
    lastSyncedAt: '',
    loading: false,
    remoteEnabled,
  })

  useEffect(() => {
    latestValueRef.current = value
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  const pullRemote = useCallback(async () => {
    if (!isSharedDatabaseConfigured(normalizedSettings)) {
      setStatus((current) => ({ ...current, error: '', loading: false, remoteEnabled: false }))
      return
    }

    setStatus((current) => ({ ...current, error: '', loading: true, remoteEnabled: true }))
    try {
      const remoteValue = await loadSharedValue<T>(normalizedSettings, key)
      if (remoteValue !== null) {
        setValue(remoteValue)
        window.localStorage.setItem(key, JSON.stringify(remoteValue))
      } else {
        await saveSharedValue(normalizedSettings, key, latestValueRef.current)
      }
      setStatus({
        error: '',
        lastSyncedAt: new Date().toISOString(),
        loading: false,
        remoteEnabled: true,
      })
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : 'Database load failed.',
        lastSyncedAt: '',
        loading: false,
        remoteEnabled: true,
      })
    }
  }, [key, normalizedSettings])

  useEffect(() => {
    void pullRemote()
  }, [pullRemote])

  const setPersistedValue = useCallback(
    (next: T) => {
      setValue(next)
      window.localStorage.setItem(key, JSON.stringify(next))
      if (!isSharedDatabaseConfigured(normalizedSettings)) return

      void saveSharedValue(normalizedSettings, key, next)
        .then(() =>
          setStatus({
            error: '',
            lastSyncedAt: new Date().toISOString(),
            loading: false,
            remoteEnabled: true,
          }),
        )
        .catch((error) =>
          setStatus({
            error: error instanceof Error ? error.message : 'Database save failed.',
            lastSyncedAt: '',
            loading: false,
            remoteEnabled: true,
          }),
        )
    },
    [key, normalizedSettings],
  )

  return [value, setPersistedValue, status, pullRemote]
}

function readLocalStorageValue<T>(key: string, initialValue: T): T {
  const stored = window.localStorage.getItem(key)
  if (!stored) return initialValue
  try {
    return JSON.parse(stored) as T
  } catch {
    return initialValue
  }
}
