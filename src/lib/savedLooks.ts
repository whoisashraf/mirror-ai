import type { TryOnGeneration } from '@/types'

const KEY = 'mirror_saved_looks_v1'

export interface SavedLook {
  generationId: string
  merchantId: string
  productIds: string[]
  imageUrl?: string
  createdAt: string
}

export function loadSavedLooks(): SavedLook[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is SavedLook =>
      typeof item?.generationId === 'string' &&
      typeof item?.merchantId === 'string' &&
      Array.isArray(item?.productIds) &&
      typeof item?.createdAt === 'string',
    )
  } catch {
    return []
  }
}

export function isLookSaved(generationId: string) {
  return loadSavedLooks().some((item) => item.generationId === generationId)
}

export function saveLook(generation: TryOnGeneration, productIds: string[]) {
  const saved: SavedLook = {
    generationId: generation.id,
    merchantId: generation.merchant_id,
    productIds: [...new Set(productIds)],
    imageUrl: generation.output_image_url,
    createdAt: new Date().toISOString(),
  }
  const items = loadSavedLooks().filter((item) => item.generationId !== saved.generationId)
  localStorage.setItem(KEY, JSON.stringify([saved, ...items].slice(0, 20)))
  return saved
}
