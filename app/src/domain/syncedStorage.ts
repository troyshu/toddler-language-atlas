import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  githubSyncFingerprint,
  isGitHubSyncConfigured,
  loadGitHubJsonFile,
  normalizeGitHubSyncSettings,
  saveGitHubJsonFile,
  type GitHubSyncSettings,
} from './sharedState'

export interface SyncedStateStatus {
  error: string
  lastSyncedAt: string
  loading: boolean
  remoteEnabled: boolean
  saving: boolean
}

export function useGitHubJsonSync<T>({
  onRemoteValue,
  settings,
  value,
}: {
  onRemoteValue: (nextValue: T) => void
  settings: GitHubSyncSettings
  value: T
}): [SyncedStateStatus, () => Promise<void>, () => Promise<void>] {
  const normalizedSettings = useMemo(() => normalizeGitHubSyncSettings(settings), [settings])
  const settingsFingerprint = useMemo(() => githubSyncFingerprint(normalizedSettings), [normalizedSettings])
  const remoteEnabled = isGitHubSyncConfigured(normalizedSettings)
  const latestValueRef = useRef(value)
  const onRemoteValueRef = useRef(onRemoteValue)
  const shaRef = useRef<string | undefined>(undefined)
  const readyRef = useRef(false)
  const savingQueueRef = useRef(Promise.resolve())
  const [status, setStatus] = useState<SyncedStateStatus>({
    error: '',
    lastSyncedAt: '',
    loading: false,
    remoteEnabled,
    saving: false,
  })

  useEffect(() => {
    latestValueRef.current = value
  }, [value])

  useEffect(() => {
    onRemoteValueRef.current = onRemoteValue
  }, [onRemoteValue])

  const pullRemote = useCallback(async () => {
    if (!isGitHubSyncConfigured(normalizedSettings)) {
      readyRef.current = false
      shaRef.current = undefined
      setStatus((current) => ({ ...current, error: '', loading: false, remoteEnabled: false, saving: false }))
      return
    }

    setStatus((current) => ({ ...current, error: '', loading: true, remoteEnabled: true }))
    try {
      const remoteFile = await loadGitHubJsonFile<T>(normalizedSettings)
      if (remoteFile) {
        shaRef.current = remoteFile.sha
        readyRef.current = true
        onRemoteValueRef.current(remoteFile.value)
      } else {
        shaRef.current = await saveGitHubJsonFile(normalizedSettings, latestValueRef.current)
        readyRef.current = true
      }
      setStatus({
        error: '',
        lastSyncedAt: new Date().toISOString(),
        loading: false,
        remoteEnabled: true,
        saving: false,
      })
    } catch (error) {
      readyRef.current = false
      setStatus({
        error: error instanceof Error ? error.message : 'GitHub sync failed.',
        lastSyncedAt: '',
        loading: false,
        remoteEnabled: true,
        saving: false,
      })
    }
  }, [normalizedSettings])

  const pushRemote = useCallback(async () => {
    if (!isGitHubSyncConfigured(normalizedSettings)) return
    if (!readyRef.current) {
      await pullRemote()
      return
    }

    setStatus((current) => ({ ...current, error: '', remoteEnabled: true, saving: true }))
    savingQueueRef.current = savingQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        shaRef.current = await saveGitHubJsonFile(normalizedSettings, latestValueRef.current, shaRef.current)
        setStatus({
          error: '',
          lastSyncedAt: new Date().toISOString(),
          loading: false,
          remoteEnabled: true,
          saving: false,
        })
      })
      .catch((error) => {
        setStatus({
          error: error instanceof Error ? error.message : 'GitHub save failed.',
          lastSyncedAt: '',
          loading: false,
          remoteEnabled: true,
          saving: false,
        })
      })
    await savingQueueRef.current
  }, [normalizedSettings, pullRemote])

  useEffect(() => {
    readyRef.current = false
    shaRef.current = undefined
    void pullRemote()
  }, [pullRemote, settingsFingerprint])

  useEffect(() => {
    if (!remoteEnabled || !readyRef.current) return
    const timeout = window.setTimeout(() => {
      void pushRemote()
    }, 900)
    return () => window.clearTimeout(timeout)
  }, [pushRemote, remoteEnabled, value])

  return [status, pullRemote, pushRemote]
}
