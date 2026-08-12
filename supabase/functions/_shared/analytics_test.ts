import { summarizeCommerceFunnel, type FunnelEvent } from './analytics.ts'

function assertEquals(actual: unknown, expected: unknown) {
  const left = JSON.stringify(actual)
  const right = JSON.stringify(expected)
  if (left !== right) throw new Error(`Expected ${right}, received ${left}`)
}

const event = (id: string, session: string, type: string, second: number, generation?: string): FunnelEvent => ({
  id,
  session_id:session,
  event_type:type,
  generation_id:generation || null,
  created_at:`2026-08-12T00:00:${String(second).padStart(2, '0')}Z`,
})

Deno.test('funnel requires events in sequence and deduplicates completions', () => {
  const summary = summarizeCommerceFunnel([
    event('1','valid','product_view',1), event('2','valid','try_on_started',2),
    event('3','valid','try_on_completed',3,'generation-a'), event('4','valid','try_on_completed',4,'generation-a'),
    event('5','valid','checkout_clicked',5),
    event('6','wrong-order','checkout_clicked',1), event('7','wrong-order','product_view',2),
    event('8','wrong-order','try_on_completed',3,'generation-b'), event('9','wrong-order','try_on_started',4),
  ])
  assertEquals(summary.funnel.map((step) => step.value), [2, 2, 1, 1])
  assertEquals(summary.completedLooks, 2)
  assertEquals(summary.tryOnCompletionRate, 50)
})

Deno.test('rates stay bounded when one session completes repeatedly', () => {
  const summary = summarizeCommerceFunnel([
    event('1','repeat','try_on_started',1),
    event('2','repeat','try_on_completed',2,'a'),
    event('3','repeat','try_on_completed',3,'b'),
  ])
  assertEquals(summary.tryOnCompletionRate, 100)
  assertEquals(summary.completedLooks, 2)
})
