import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = !!(supabaseUrl && supabaseAnonKey)

/**
 * Build a no-op client when env vars are missing. Every chainable method
 * returns the same proxy so calls like
 *   supabase.from('x').select('*').eq().order().single()
 * never throw — they just resolve to an empty/null result.
 */
function makeStubClient() {
  const stubError = new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')

  // Chainable proxy: every property returns itself, awaiting it yields
  // { data: null, error: stubError }. Tolerates any builder chain.
  const chain = new Proxy(function noop() {}, {
    get(_, prop) {
      if (prop === 'then') {
        // Allow `await` on the chain
        return (resolve) => resolve({ data: null, error: stubError })
      }
      return () => chain
    },
    apply() {
      return chain
    },
  })

  return {
    isConfigured: false,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: stubError }),
      signInWithOAuth: async () => ({ data: null, error: stubError }),
      signUp: async () => ({ data: null, error: stubError }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: stubError }),
    },
    from: () => chain,
  }
}

export const supabase = isConfigured
  ? Object.assign(createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }), { isConfigured: true })
  : makeStubClient()

if (typeof window !== 'undefined' && !isConfigured) {
  // Surface this once in dev tools so deployments without env vars are obvious.
  // eslint-disable-next-line no-console
  console.warn(
    '[Halaq] Supabase env vars missing — running in offline mode. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and redeploy.'
  )
}
