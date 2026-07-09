import type { AssetCandidateSearchOptions } from './assetCandidateProviders'

export interface ImageSourceSettings extends AssetCandidateSearchOptions {
  includeOpenSources: boolean
  pexelsApiKey: string
  pixabayApiKey: string
}

export const sourceSettingsStorageKey = 'tla.assetSourceSettings.v1'

export const initialSourceSettings: ImageSourceSettings = {
  includeOpenSources: true,
  pexelsApiKey: import.meta.env.VITE_PEXELS_API_KEY ?? '',
  pixabayApiKey: import.meta.env.VITE_PIXABAY_API_KEY ?? '',
}

export function normalizeImageSourceSettings(input: Partial<ImageSourceSettings> | null | undefined): ImageSourceSettings {
  return {
    includeOpenSources: typeof input?.includeOpenSources === 'boolean' ? input.includeOpenSources : true,
    pexelsApiKey: typeof input?.pexelsApiKey === 'string' ? input.pexelsApiKey : '',
    pixabayApiKey: typeof input?.pixabayApiKey === 'string' ? input.pixabayApiKey : '',
  }
}
