import { isPlatformHost } from '../src/lib/platform-host.ts'

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
}

Deno.test('recognizes local and deployed Mirror platform hosts', () => {
  assertEquals(isPlatformHost('localhost'), true)
  assertEquals(isPlatformHost('127.0.0.1'), true)
  assertEquals(isPlatformHost('mirror.ai'), true)
  assertEquals(isPlatformHost('www.mirror.ai'), true)
  assertEquals(isPlatformHost('mirror-ai-2ine.onrender.com'), true)
})

Deno.test('preserves retailer custom-domain resolution', () => {
  assertEquals(isPlatformHost('shop.example.com'), false)
  assertEquals(isPlatformHost('MIRROR-AI-2INE.ONRENDER.COM.'), true)
})
