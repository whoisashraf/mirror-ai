import { defineStore } from 'pinia'
import { createTryOn, trackEvent } from '@/lib/api'
import type { TryOnGeneration } from '@/types'

export const useTryOnStore = defineStore('tryOn', {
  state: () => ({
    current: null as TryOnGeneration | null,
    history: [] as TryOnGeneration[],
    timer: 0 as number,
  }),
  actions: {
    remember(generation: TryOnGeneration) {
      if (generation.status !== 'completed') return
      const without = this.history.filter((item) => item.id !== generation.id)
      this.history = [...without, generation].slice(-8)
    },
    selectHistory(id: string) {
      const generation = this.history.find((item) => item.id === id)
      if (generation) this.current = { ...generation }
    },
    reset() {
      this.stopPolling()
      this.current = null
      this.history = []
    },
    async start(params: Parameters<typeof createTryOn>[0]) {
      this.stopPolling()
      const localId = crypto.randomUUID()
      this.current = {
        id: localId,
        merchant_id: params.merchantId,
        session_id: params.sessionId,
        shopper_image_id: params.shopperImageId,
        shopperImageUrl: params.shopperImageUrl,
        productIds: params.productIds,
        mode: params.mode,
        parent_generation_id: params.parentGenerationId || null,
        status: 'preparing',
        created_at: new Date().toISOString(),
      }
      await trackEvent(params.mode === 'complete_look' ? 'complete_look_started' : 'try_on_started', {
        merchantId: params.merchantId,
        sessionId: params.sessionId,
        productId: params.productIds[0],
        metadata: { mode: params.mode, productIds: params.productIds },
      })

      let tick = 0
      this.timer = window.setInterval(() => {
        tick += 1
        if (!this.current || this.current.status === 'completed' || this.current.status === 'failed') return
        if (tick >= 6) this.current.status = 'finalizing'
        else if (tick >= 3) this.current.status = 'generating'
      }, 700)

      try {
        const generation = await createTryOn(params)
        this.current = generation
        if (generation.status === 'preparing' || generation.status === 'generating' || generation.status === 'finalizing') {
          const started = Date.now()
          while (this.current && this.current.status !== 'completed' && this.current.status !== 'failed' && Date.now() - started < 10000) {
            await new Promise((resolve) => setTimeout(resolve, 700))
            const elapsed = Date.now() - new Date(generation.created_at).getTime()
            this.current = {
              ...generation,
              status: elapsed < 1200 ? 'preparing' : elapsed < 2600 ? 'generating' : elapsed < 3800 ? 'finalizing' : 'completed',
              output_image_url: elapsed >= 3800 ? (generation.output_image_url || generation.shopperImageUrl) : undefined,
            }
          }
        }
        this.stopPolling()
        const finished = this.current ?? generation
        this.remember(finished)
        await trackEvent(
          finished.status === 'completed' ? (params.mode === 'complete_look' ? 'complete_look_completed' : 'try_on_completed') : 'try_on_failed',
          {
            merchantId: params.merchantId,
            sessionId: params.sessionId,
            generationId: finished.id,
            productId: params.productIds[0],
            metadata: { productIds: params.productIds },
          },
        )
        return finished
      } catch (error) {
        this.stopPolling()
        if (this.current) {
          this.current.status = 'failed'
          this.current.error = error instanceof Error ? error.message : String(error)
        }
        await trackEvent('try_on_failed', {
          merchantId: params.merchantId,
          sessionId: params.sessionId,
          productId: params.productIds[0],
          metadata: { localGenerationId: localId, productIds: params.productIds },
        })
        throw error
      }
    },
    stopPolling() {
      if (this.timer) window.clearInterval(this.timer)
      this.timer = 0
    },
  },
})
