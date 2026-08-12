export interface FunnelEvent {
  id: string
  event_type: string
  session_id: string
  generation_id?: string | null
  created_at: string
}

const START_TYPES = new Set(['try_on_started', 'complete_look_started'])
const COMPLETE_TYPES = new Set(['try_on_completed', 'complete_look_completed'])

export function summarizeCommerceFunnel(events: FunnelEvent[]) {
  const ordered = [...events].sort((a, b) => {
    const time = a.created_at.localeCompare(b.created_at)
    return time || a.id.localeCompare(b.id)
  })
  const bySession = new Map<string, FunnelEvent[]>()
  for (const event of ordered) {
    if (!event.session_id) continue
    const current = bySession.get(event.session_id) || []
    current.push(event)
    bySession.set(event.session_id, current)
  }

  let viewed = 0
  let startedAfterView = 0
  let completedAfterStart = 0
  let checkoutAfterComplete = 0
  let startedSessions = 0
  let completedStartedSessions = 0

  for (const sessionEvents of bySession.values()) {
    const startIndex = sessionEvents.findIndex((event) => START_TYPES.has(event.event_type))
    if (startIndex >= 0) {
      startedSessions += 1
      if (sessionEvents.slice(startIndex + 1).some((event) => COMPLETE_TYPES.has(event.event_type))) completedStartedSessions += 1
    }

    const viewIndex = sessionEvents.findIndex((event) => event.event_type === 'product_view')
    if (viewIndex < 0) continue
    viewed += 1
    const funnelStartIndex = sessionEvents.findIndex((event, index) => index > viewIndex && START_TYPES.has(event.event_type))
    if (funnelStartIndex < 0) continue
    startedAfterView += 1
    const completeIndex = sessionEvents.findIndex((event, index) => index > funnelStartIndex && COMPLETE_TYPES.has(event.event_type))
    if (completeIndex < 0) continue
    completedAfterStart += 1
    if (sessionEvents.some((event, index) => index > completeIndex && event.event_type === 'checkout_clicked')) checkoutAfterComplete += 1
  }

  const completedEvents = ordered.filter((event) => COMPLETE_TYPES.has(event.event_type))
  const completedLooks = new Set(completedEvents.map((event) => event.generation_id || event.id)).size
  const pct = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0

  return {
    completedLooks,
    checkoutSessions: new Set(ordered.filter((event) => event.event_type === 'checkout_clicked').map((event) => event.session_id).filter(Boolean)).size,
    tryOnCompletionRate: pct(completedStartedSessions, startedSessions),
    checkoutRate: pct(checkoutAfterComplete, completedAfterStart),
    funnel: [
      { label:'Viewed a product', value:viewed, conversionFromPrevious:null },
      { label:'Started a try-on', value:startedAfterView, conversionFromPrevious:pct(startedAfterView, viewed) },
      { label:'Completed a try-on', value:completedAfterStart, conversionFromPrevious:pct(completedAfterStart, startedAfterView) },
      { label:'Clicked to checkout', value:checkoutAfterComplete, conversionFromPrevious:pct(checkoutAfterComplete, completedAfterStart) },
    ],
  }
}
