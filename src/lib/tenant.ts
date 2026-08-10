import type { Merchant } from '@/types'

const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'mirror.ai',
  'www.mirror.ai',
])

export function storefrontPath(merchant: Merchant, path = '') {
  const clean = path.startsWith('/') ? path : `/${path}`
  if (merchant.custom_domain && typeof window !== 'undefined' && window.location.hostname === merchant.custom_domain) return clean
  return `/store/${merchant.slug}${clean === '/' ? '' : clean}`
}

export function tenantSlugFromRoute(routeSlug?: string | string[] | null) {
  if (typeof routeSlug === 'string' && routeSlug.trim()) return routeSlug.trim()
  return null
}

export function customTenantHost() {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname.toLowerCase()
  return PLATFORM_HOSTS.has(host) ? null : host
}

export function applyStorefrontTheme(merchant: Merchant) {
  if (typeof document === 'undefined') return
  const cfg = merchant.storefront_config || {}
  const root = document.documentElement
  root.style.setProperty('--store-accent', cfg.accentColor || merchant.primary_brand_colour || '#111111')
  root.style.setProperty('--store-background', cfg.backgroundColor || '#f7f5f1')
  root.style.setProperty('--store-text', cfg.textColor || '#111111')
  document.title = `${merchant.name} — Virtual Try-On`

  const favicon = cfg.faviconUrl
  if (favicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = favicon
  }
}

const TENANT_KEY = 'mirror_active_merchant_id'

export function activateTenantScope(merchantId: string) {
  if (typeof localStorage === 'undefined') return false
  const previous = localStorage.getItem(TENANT_KEY)
  const changed = Boolean(previous && previous !== merchantId)
  localStorage.setItem(TENANT_KEY, merchantId)
  return changed
}
