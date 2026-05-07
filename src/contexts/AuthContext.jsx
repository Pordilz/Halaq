import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId || !supabase.isConfigured) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data || null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user?.id, fetchProfile])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) await fetchProfile(currentUser.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        await fetchProfile(currentUser.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const tier = profile?.subscription_tier || 'free'
  const isPro = tier === 'pro' || tier === 'scholar' || tier === 'admin'
  const isScholar = tier === 'scholar' || tier === 'admin'
  const dailyCount = profile?.daily_search_count || 0
  const canSearch = isPro || dailyCount < 5

  const signUp = (email, password) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
      },
    })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const sendPasswordReset = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

  /**
   * OAuth login — supports 'google' and 'apple'. Redirects the browser to the
   * provider, then back to /home. Requires the provider to be enabled in
   * Supabase → Authentication → Providers.
   */
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
