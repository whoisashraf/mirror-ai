import { defineStore } from 'pinia'
import { clearShopperSession, getOrCreateSessionId, getOrCreateSessionToken } from '@/lib/session'
import { deleteShopperImage, getBasePhotoUrl, uploadShopperImage } from '@/lib/api'
import type { PhotoAssessment, StylePreference, TryOnCategory } from '@/types'

const STYLE_KEY = 'mirror_style_preference'
const BASE_PHOTO_KEY = 'mirror_base_photo_v1'
const ACCOUNT_KEY = 'mirror_active_auth_user_id'
interface BasePhotoRecord { merchantId: string; imageId: string }

function savedBasePhoto(merchantId: string): BasePhotoRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(BASE_PHOTO_KEY) || 'null')
    return value?.merchantId === merchantId && typeof value?.imageId === 'string' ? value : null
  } catch { return null }
}
function savedStylePreference(): StylePreference | '' {
  const value = typeof localStorage === 'undefined' ? '' : localStorage.getItem(STYLE_KEY)
  return value === 'menswear' || value === 'womenswear' || value === 'any' ? value : ''
}

async function assessPhoto(file: File, category?: TryOnCategory): Promise<PhotoAssessment> {
  let width = 0
  let height = 0
  try {
    const bitmap = await createImageBitmap(file)
    width = bitmap.width
    height = bitmap.height
    bitmap.close()
  } catch {
    return {
      ready: true,
      score: 70,
      width: 0,
      height: 0,
      checks: [{ label: 'Image check', status: 'warn', detail: 'Mirror could not inspect dimensions. You can still continue.' }],
    }
  }

  const checks: PhotoAssessment['checks'] = []
  const minDimension = Math.min(width, height)
  checks.push({
    label: 'Resolution',
    status: minDimension >= 720 ? 'pass' : 'warn',
    detail: minDimension >= 720 ? 'Enough detail for a strong preview.' : 'A higher-resolution image may produce a cleaner result.',
  })

  const portraitRatio = width / Math.max(1, height)
  const needsFullBody = ['shoes', 'bottom', 'dress'].includes(category || '')
  if (needsFullBody) {
    checks.push({
      label: 'Framing',
      status: portraitRatio <= 0.9 ? 'pass' : 'warn',
      detail: portraitRatio <= 0.9
        ? 'Portrait framing is suitable for a full-body try-on.'
        : category === 'shoes'
          ? 'For shoes, use a portrait/full-body photo with both feet visible.'
          : 'A portrait/full-body photo will work better for this item.',
    })
  } else {
    checks.push({
      label: 'Framing',
      status: portraitRatio <= 1.35 ? 'pass' : 'warn',
      detail: portraitRatio <= 1.35 ? 'Framing looks usable.' : 'Very wide crops can hide parts of the garment area.',
    })
  }

  const warnings = checks.filter((check) => check.status === 'warn').length
  const score = Math.max(55, 100 - warnings * 20)
  return { ready: score >= 60, score, width, height, checks }
}

export const useShopperStore = defineStore('shopper', {
  state: () => ({
    sessionId: '',
    sessionToken: '',
    imageId: '' as string,
    imageUrl: '' as string,
    imageStoragePath: '' as string,
    consentAt: '' as string,
    uploading: false,
    restoringPhoto: false,
    photoAssessment: null as PhotoAssessment | null,
    stylePreference: savedStylePreference(),
  }),
  actions: {
    syncAuthenticatedUser(userId: string | null) {
      const previous = localStorage.getItem(ACCOUNT_KEY)
      if (previous === userId) return false
      localStorage.removeItem(BASE_PHOTO_KEY)
      clearShopperSession()
      this.imageId = ''
      this.imageUrl = ''
      this.imageStoragePath = ''
      this.consentAt = ''
      this.photoAssessment = null
      this.sessionId = ''
      this.sessionToken = ''
      if (userId) localStorage.setItem(ACCOUNT_KEY, userId)
      else localStorage.removeItem(ACCOUNT_KEY)
      this.ensureSession()
      return true
    },
    ensureSession() {
      if (!this.sessionId) this.sessionId = getOrCreateSessionId()
      if (!this.sessionToken) this.sessionToken = getOrCreateSessionToken()
    },
    setStylePreference(value: StylePreference) {
      this.stylePreference = value
      localStorage.setItem(STYLE_KEY, value)
    },
    async setPhoto(file: File, merchantId: string, category?: TryOnCategory) {
      this.ensureSession()
      this.uploading = true
      const previous = { id:this.imageId, path:this.imageStoragePath }
      try {
        this.photoAssessment = await assessPhoto(file, category)
        this.consentAt = new Date().toISOString()
        const result = await uploadShopperImage(file, merchantId, this.consentAt)
        this.imageId = result.id
        this.imageUrl = result.url
        this.imageStoragePath = result.storagePath
        localStorage.setItem(BASE_PHOTO_KEY, JSON.stringify({ merchantId, imageId:result.id }))
        if (previous.id && previous.path && previous.path !== 'demo/local' && previous.id !== result.id) {
          void deleteShopperImage(previous.id, previous.path, merchantId).catch((error) => console.warn('[Mirror base photo] Could not remove replaced photo.', error))
        }
      } finally { this.uploading = false }
    },
    async restoreBasePhoto(merchantId: string) {
      if (this.imageUrl || this.restoringPhoto) return Boolean(this.imageUrl)
      const saved = savedBasePhoto(merchantId)
      if (!saved) return false
      this.ensureSession()
      this.restoringPhoto = true
      try {
        const image = await getBasePhotoUrl(merchantId, saved.imageId)
        this.imageId = image.id
        this.imageUrl = image.signedUrl
        this.imageStoragePath = image.storagePath
        this.consentAt = image.consentAt
        return true
      } catch {
        localStorage.removeItem(BASE_PHOTO_KEY)
        return false
      } finally { this.restoringPhoto = false }
    },
    async clearPhoto(merchantId?: string) {
      const oldUrl = this.imageUrl, oldId = this.imageId, oldPath = this.imageStoragePath
      if (oldId && oldPath && oldPath !== 'demo/local') await deleteShopperImage(oldId, oldPath, merchantId)
      if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl)
      this.imageId = ''; this.imageUrl = ''; this.imageStoragePath = ''; this.consentAt = ''
      localStorage.removeItem(BASE_PHOTO_KEY)
      this.photoAssessment = null
    },
    resetLocal() {
      if (this.imageUrl.startsWith('blob:')) URL.revokeObjectURL(this.imageUrl)
      this.$reset()
      this.ensureSession()
    },
    rotateSession() {
      clearShopperSession()
      this.sessionId = ''
      this.sessionToken = ''
      this.ensureSession()
    },
  },
})
