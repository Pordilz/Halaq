import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Screener from './pages/Screener'
import StockDetail from './pages/StockDetail'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Watchlist from './pages/Watchlist'
import Learn from './pages/Learn'
import Profile from './pages/Profile'
import Batch from './pages/Batch'
import ETF from './pages/ETF'
import Chat from './pages/Chat'
import NotFound from './pages/NotFound'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Core Free Pages */}
        <Route path="/screener" element={<Screener />} />
        <Route path="/stock/:ticker" element={<StockDetail />} />
        <Route path="/learn" element={<Learn />} />
        
        {/* User Protected Pages */}
        <Route path="/watchlist" element={
          <ProtectedRoute>
            <Watchlist />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Premium Core Feature Pages */}
        <Route path="/batch" element={
          <ProtectedRoute>
            <Batch />
          </ProtectedRoute>
        } />
        <Route path="/etf" element={
          <ProtectedRoute>
            <ETF />
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
