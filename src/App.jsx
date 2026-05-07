import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
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

            {/* Pro+ tools */}
            <Route
              path="/batch"
              element={
                <ProtectedRoute requireTier="pro">
                  <Batch />
                </ProtectedRoute>
              }
            />
            <Route
              path="/etf"
              element={
                <ProtectedRoute requireTier="scholar">
                  <ETF />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute requireTier="scholar">
                  <Chat />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}
