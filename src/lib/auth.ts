import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

let currentUser: User | null = null
let initialized = false
let initialization: Promise<User | null> | null = null

export async function initializeAuth(): Promise<User | null> {
  if (initialized) return currentUser
  if (initialization) return initialization

  initialization = supabase.auth.getUser().then(({ data, error }) => {
    currentUser = error ? null : data.user
    initialized = true
    return currentUser
  }).finally(() => { initialization = null })

  return initialization
}

export function setCurrentUser(user: User | null) {
  currentUser = user
  initialized = true
}

export function startAuthListener() {
  return supabase.auth.onAuthStateChange((_event, session) => setCurrentUser(session?.user ?? null))
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  setCurrentUser(null)
}
