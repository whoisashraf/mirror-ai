import { defineStore } from 'pinia'
import { chatWithMirror, trackEvent } from '@/lib/api'
import type { ChatMessage, StylePreference } from '@/types'

function classifyIntent(message: string) {
  const text = message.toLowerCase()
  if (text.includes('pair') || text.includes('what goes') || text.includes('what can i wear')) return 'pairing'
  if (text.includes('interview') || text.includes('wedding') || text.includes('office') || text.includes('occasion')) return 'occasion'
  if (text.includes('skin tone') || text.includes('colour') || text.includes('color')) return 'colour'
  if (text.includes('under ') || text.includes('budget') || text.includes('₦')) return 'budget'
  if (text.includes('modest') || text.includes('coverage')) return 'modesty'
  if (text.includes('casual')) return 'casual'
  if (text.includes('formal') || text.includes('dress up')) return 'formal'
  return 'other'
}

export const useChatStore = defineStore('chat', {
  state: () => ({ conversationId: '' as string, messages: [] as ChatMessage[], sending: false, error: '' }),
  actions: {
    reset() { this.conversationId = ''; this.messages = []; this.sending = false; this.error = '' },
    async send(params: { merchantId: string; sessionId: string; message: string; selectedProductId?: string; generationId?: string; shopperImageId?: string; currentProductIds?: string[]; stylePreference: StylePreference }) {
      if (!params.message.trim() || this.sending) return
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role:'user', content:params.message.trim(), createdAt:new Date().toISOString() }
      this.messages.push(userMessage)
      this.sending = true
      this.error = ''
      const intent = classifyIntent(userMessage.content)
      if (!this.conversationId) await trackEvent('chat_started', { merchantId: params.merchantId, sessionId: params.sessionId, productId: params.selectedProductId })
      await trackEvent('chat_message_sent', { merchantId: params.merchantId, sessionId: params.sessionId, productId: params.selectedProductId, generationId:params.generationId, metadata:{intent,currentProductIds:params.currentProductIds || []} })
      try {
        const result = await chatWithMirror({ ...params, message: userMessage.content, conversationId: this.conversationId || undefined })
        this.conversationId = result.conversationId
        this.messages.push({
          id:crypto.randomUUID(), role:'assistant', content:result.reply.message,
          recommendations:result.reply.recommendations, suggestedActions:result.reply.suggestedActions,
          createdAt:new Date().toISOString(),
        })
        return result.reply
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Mirror could not answer right now.'
        return undefined
      } finally { this.sending = false }
    },
  },
})
