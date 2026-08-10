const ID_KEY = 'mirror_session_id'
const TOKEN_KEY = 'mirror_session_token'

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getOrCreateSessionId() {
  let id = localStorage.getItem(ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(ID_KEY, id)
  }
  return id
}

export function getOrCreateSessionToken() {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = randomToken()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function getShopperSession() {
  return { id: getOrCreateSessionId(), token: getOrCreateSessionToken() }
}

export function clearShopperSession() {
  localStorage.removeItem(ID_KEY)
  localStorage.removeItem(TOKEN_KEY)
}
