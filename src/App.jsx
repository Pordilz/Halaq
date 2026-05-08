import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import RedirectIfAuthed from './components/RedirectIfAuthed'
import ErrorBoundary from './components/ErrorBoundary'
import AppLoader from './components/AppLoader'

// Eager: small + visible right away
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'

// Lazy
const Home = lazy(() => import('./pages/Home'))
const Screener = lazy(() => import('./pages/Screener'))
const StockDetail = lazy(() => import('./pages/StockDetail'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Watchlist = lazy(() => import('./pages/Watchlist'))
const Learn = lazy(() => import('./pages/Learn'))
const Profile = lazy(() => import('./pages/Profile'))
const Batch = lazy(() => import('./pages/Batch'))
const ETF = lazy(() => import('./pages/ETF'))
const Chat = lazy(() => import('./pages/Chat'))
const Upgrade = lazy(() => import('./pages/Upgrade'))
const Legal = lazy(() => import('./pages/Legal'))

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Suspense fallback={<AppLoader />}>
          <Routes>
            {/* Public landing — auto-redirects signed-in users to /home */}
            <Route
              path="/"
              element={
                <RedirectIfAuthed>
                  <Landing />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfAuthed>
                  <Login />
                </RedirectIfAuthed>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuthed>
                  <Signup />
                </RedirectIfAuthed>
              }
            />

            {/* App home for signed-in users */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Public app pages */}
            <Route path="/screener" element={<Screener />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/upgrade" element={<Upgrade />} />

            {/* Authenticated */}
            <Route
              path="/watchlist"
              element={
                <ProtectedRoute>
                  <Watchlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Pro+ tools — gate at the page level (each renders its own
                paywall card for non-tier users). Bouncing the user to
                /upgrade with no context is a worse UX than letting them
                see what the feature is and then upgrading. */}
            <Route
              path="/batch"
              element={
                <ProtectedRoute>
                  <Batch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/etf"
              element={
                <ProtectedRoute>
                  <ETF />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            {/* Legal pages — required by auth/billing flows. */}
            <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
            <Route path="/legal/:slug" element={<Legal />} />

            {/* Legacy redirect: Lemon Squeezy receipts and old checkout
                sessions point at /settings. Forward to /profile and preserve
                any query (e.g. ?upgrade=success) so the success banner shows. */}
            <Route path="/settings" element={<SettingsRedirect />} />
            <Route path="/settings/*" element={<SettingsRedirect />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

// Forward /settings → /profile, preserving query string (?upgrade=success).
function SettingsRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/profile${search}`} replace />
}
