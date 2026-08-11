export type UUID = string
export type StyleAudience = 'menswear' | 'womenswear' | 'unisex'
export type StylePreference = 'menswear' | 'womenswear' | 'any'

export type TryOnCategory =
  | 'top'
  | 'outerwear'
  | 'dress'
  | 'bottom'
  | 'shoes'
  | 'bag'
  | 'necklace'
  | 'earrings'
  | 'headwear'
  | 'other_accessory'

export interface StorefrontConfig {
  logoUrl?: string | null
  faviconUrl?: string | null
  heroTitle?: string | null
  heroCopy?: string | null
  heroImageUrl?: string | null
  accentColor?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  tryOnLabel?: string | null
  assistantName?: string | null
  showPoweredByMirror?: boolean
}

export interface Merchant {
  id: UUID
  owner_user_id?: UUID | null
  name: string
  slug: string
  description: string
  logo_url?: string | null
  website_url?: string | null
  custom_domain?: string | null
  currency: string
  primary_brand_colour?: string | null
  storefront_config?: StorefrontConfig | null
}

export interface ProductReferenceImage {
  url: string
  view: 'front' | 'back' | 'side' | 'detail'
}

export interface ProductGenerationConstraints {
  preserveColour?: boolean
  preservePattern?: boolean
  preserveLogo?: boolean
}

export interface Product {
  id: UUID
  merchant_id: UUID
  name: string
  description: string
  price: number
  currency: string
  category: string
  try_on_category?: TryOnCategory
  style_audience?: StyleAudience
  primary_image_url: string
  reference_images?: ProductReferenceImage[]
  visual_description?: string | null
  generation_constraints?: ProductGenerationConstraints
  product_url: string
  sizes: string[]
  colours: string[]
  tags: string[]
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock'
  is_active: boolean
}

export interface Recommendation {
  productId: UUID
  reason: string
}

export type MirrorActionType =
  | 'try_complete_look'
  | 'add_product'
  | 'replace_product'
  | 'remove_product'
  | 'shop_look'

export interface MirrorAction {
  type: MirrorActionType
  label: string
  productId?: UUID
  targetProductId?: UUID
}

export interface MirrorReply {
  message: string
  recommendations: Recommendation[]
  suggestedActions: Array<string | MirrorAction>
}

export interface ChatMessage {
  id: UUID
  role: 'user' | 'assistant'
  content: string
  recommendations?: Recommendation[]
  suggestedActions?: Array<string | MirrorAction>
  createdAt: string
}

export type GenerationStatus = 'idle' | 'preparing' | 'generating' | 'finalizing' | 'completed' | 'failed'

export interface FidelityIssue {
  productId: UUID
  fidelity: number
  problems: string[]
}

export interface FidelityReport {
  overall: number
  products: FidelityIssue[]
  correctionAttempted?: boolean
}

export interface TryOnGeneration {
  id: UUID
  merchant_id: UUID
  session_id: string
  shopper_image_id?: UUID
  shopperImageUrl?: string
  productIds: UUID[]
  status: GenerationStatus
  output_image_url?: string
  output_storage_path?: string
  provider?: string
  model?: string
  error?: string
  mode: 'single' | 'complete_look'
  parent_generation_id?: UUID | null
  provider_interaction_id?: string | null
  fidelity_report?: FidelityReport | null
  created_at: string
}

export interface PhotoAssessment {
  ready: boolean
  score: number
  width: number
  height: number
  checks: Array<{ label: string; status: 'pass' | 'warn'; detail: string }>
}

export interface IntentInsight {
  label: string
  count: number
  share: number
}

export interface ProductInsight {
  productId: UUID
  name: string
  tryOns: number
  recommendationClicks: number
}

export interface AnalyticsSummary {
  productCount: number
  tryOns: number
  conversations: number
  recommendationClicks: number
  checkoutClicks: number
  funnel: Array<{ label: string; value: number }>
  shopperIntents?: IntentInsight[]
  topProducts?: ProductInsight[]
}
