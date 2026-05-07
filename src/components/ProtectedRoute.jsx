import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLoader from './AppLoader'

export function ProtectedRoute({ children, requireTier }) {
  const { user, loading, isPro, isScholar } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AppLoader label="Verifying your session…" />
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }

  if (requireTier === 'scholar' && !isScholar) {
    return <Navigate to="/upgrade?tier=scholar" replace />
  }
  if (requireTier === 'pro' && !isPro) {
    return <Navigate to="/upgrade?tier=pro" replace />
  }

  return children
}
