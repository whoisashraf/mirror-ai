const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'mirror.ai',
  'www.mirror.ai',
  'mirror-ai-2ine.onrender.com',
])

export function isPlatformHost(host: string) {
  return PLATFORM_HOSTS.has(host.trim().toLowerCase().replace(/\.$/, ''))
}
