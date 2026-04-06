import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a dummy client if keys are missing to prevent breaking the build before the user provides the keys
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
        signOut: async () => ({ error: null })
      },
      from: () => ({
        select: () => ({
          eq: () => ({ data: [], error: null })
        }),
        insert: () => ({
          select: () => ({ data: null, error: new Error('Supabase not configured') })
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({ error: new Error('Supabase not configured') })
          })
        })
      }),
      isConfigured: false
    }

if (supabaseUrl && supabaseAnonKey) {
  supabase.isConfigured = true;
}
