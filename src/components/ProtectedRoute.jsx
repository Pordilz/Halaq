import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

// Prevents non-authenticated users from accessing protected pages
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)' }}>
        <Loader2 className="spinner" size={32} />
      </div>
    )
  }

  const location = useLocation()

  if (!user) {
    return <Navigate to={`/signup?redirect=${location.pathname}`} replace />
  }

  return children
}
