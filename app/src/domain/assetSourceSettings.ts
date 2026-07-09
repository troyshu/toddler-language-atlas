import type { AssetCandidateSearchOptions } from './assetCandidateProviders'

export interface ImageSourceSettings extends AssetCandidateSearchOptions {
  includeOpenSources: boolean
  pexelsApiKey: string
  pixabayApiKey: string
}

export const sourceSettingsStorageKey = 'tla.assetSourceSettings.v2'

export const initialSourceSettings: ImageSourceSettings = {
  includeOpenSources: false,
  pexelsApiKey: import.meta.env.VITE_PEXELS_API_KEY ?? '',
  pixabayApiKey: import.meta.env.VITE_PIXABAY_API_KEY ?? '',
}

export function normalizeImageSourceSettings(input: Partial<ImageSourceSettings> | null | undefined): ImageSourceSettings {
  return {
    includeOpenSources: typeof input?.includeOpenSources === 'boolean' ? input.includeOpenSources : false,
    pexelsApiKey: typeof input?.pexelsApiKey === 'string' ? input.pexelsApiKey : '',
    pixabayApiKey: typeof input?.pixabayApiKey === 'string' ? input.pixabayApiKey : '',
  }
}
