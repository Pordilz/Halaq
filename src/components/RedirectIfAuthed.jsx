import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AppLoader from './AppLoader'

/**
 * Wraps the public Landing/Login/Signup routes so an already-signed-in user
 * is sent straight to /home. Implements the "stay signed in until you log out"
 * behaviour the user expects after first signup.
 */
export default function RedirectIfAuthed({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoader label="Restoring session…" />
  if (user) return <Navigate to="/home" replace />
  return children
}
