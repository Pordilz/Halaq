import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from './MaterialIcon'

// Prevents non-authenticated users from accessing protected pages
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)' }}>
        <MaterialIcon name="refresh" className="spinner text-primary" size={32} />
      </div>
    )
  }

  const location = useLocation()

  if (!user) {
    return <Navigate to={`/signup?redirect=${location.pathname}`} replace />
  }

  return children
}
