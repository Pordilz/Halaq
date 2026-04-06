import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Listen for changes on auth state (in, out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        setLoading(true)
        fetchProfile(currentUser.id).finally(() => setLoading(false))
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const tier = profile?.subscription_tier || 'free'
  const isPro = tier === 'pro' || tier === 'scholar'
  const isScholar = tier === 'scholar'
  const canSearch = isPro || (profile?.daily_search_count || 0) < 5

  const signUp = async (email, password) => {
    return supabase.auth.signUp({ email, password })
  }

  const signIn = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    return supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, tier, isPro, isScholar, canSearch, loading, signUp, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
