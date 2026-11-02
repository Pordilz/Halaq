import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import AppLoader from './AppLoader'

/**
 * `signedOutTo` sends signed-out visitors somewhere other than the login page:
 * /home is the signed-in dashboard, and a visitor who lands on it should see
 * the public home page instead.
 */
export function ProtectedRoute({ children, requireTier, signedOutTo }) {
  const { user, loading, isPro, isScholar } = useAuth()
  const location = useLocation()

  if (loading) {
    return <AppLoader label="Verifying your session…" />
  }

  if (!user) {
    if (signedOutTo) return <Navigate to={signedOutTo} replace />
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
