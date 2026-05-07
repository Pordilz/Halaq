import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

// Hard ceiling for the initial "restoring session" loader. If Supabase is
// unreachable, mis-configured, or the network drops, we still hand control
// back to the app rather than stranding the user on the loader forever.
const SESSION_RESOLVE_TIMEOUT_MS = 4000

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Profile fetch is best-effort; failures must never block auth resolution.
  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !supabase.isConfigured) {
      setProfile(null)
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data || null)
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[Halaq] Could not load profile:', err?.message || err)
      }
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  useEffect(() => {
    let active = true
    let resolved = false

    const resolve = () => {
      if (!resolved && active) {
        resolved = true
        setLoading(false)
      }
    }

    // Safety net: if Supabase never replies, release the loader anyway.
    const timer = setTimeout(resolve, SESSION_RESOLVE_TIMEOUT_MS)

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!active) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        // Don't await — profile fetch must not block UI hydration.
        if (currentUser) fetchProfile(currentUser.id)
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.warn('[Halaq] getSession failed:', err?.message || err)
        }
      } finally {
        clearTimeout(timer)
        resolve()
      }
    })()

    let subscription
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        // First auth-state event also unlocks the loader (covers the case
        // where getSession() returned but a refresh-token kicks in late).
        resolve()
      })
      subscription = data?.subscription
    } catch (err) {
      if (typeof console !== 'undefined') {
        console.warn('[Halaq] onAuthStateChange failed:', err?.message || err)
      }
    }

    return () => {
      active = false
      clearTimeout(timer)
      try { subscription?.unsubscribe?.() } catch {}
    }
  }, [fetchProfile])

  const tier = profile?.subscription_tier || 'free'
  const isPro = tier === 'pro' || tier === 'scholar' || tier === 'admin'
  const isScholar = tier === 'scholar' || tier === 'admin'
  const dailyCount = profile?.daily_search_count || 0
  const canSearch = isPro || dailyCount < 5

  /**
   * Sign up with optional metadata (e.g. { username }). The Supabase trigger
   * `handle_new_user` reads these into the public.profiles row on insert.
   */
  const signUp = (email, password, metadata) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: metadata && typeof metadata === 'object' ? metadata : undefined,
      },
    })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

  const signInWithProvider = (provider) =>
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    })

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tier,
        isPro,
        isScholar,
        canSearch,
        loading,
        configured: !!supabase.isConfigured,
        signUp,
        signIn,
        signOut,
        sendPasswordReset,
        signInWithProvider,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
