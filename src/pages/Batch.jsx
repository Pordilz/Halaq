import { useAuth } from '../contexts/AuthContext'

export default function Batch() {
  const { isPro } = useAuth()
  return (
    <div className="container" style={{ padding: '4rem 0' }}>
      <h1>Batch Screening</h1>
      <p className="text-muted">Coming soon in Phase 3. You will be able to screen up to 20 tickers at once!</p>
    </div>
  )
}
