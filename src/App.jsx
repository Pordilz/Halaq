import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Screener from './pages/Screener'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Batch from './pages/Batch'
import ETF from './pages/ETF'
import Chat from './pages/Chat'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
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
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />
      </Routes>
    </Layout>
  )
}
