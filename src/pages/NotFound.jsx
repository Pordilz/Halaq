import { useNavigate } from 'react-router-dom'
import MaterialIcon from '../components/MaterialIcon'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="container" style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--color-primary)', opacity: 0.15, lineHeight: 1 }}>404</div>
      <MaterialIcon name="explore_off" size={48} className="text-outline-variant" style={{ marginTop: '1rem', marginBottom: '1.5rem' }} />
      <h1 className="text-h2" style={{ marginBottom: '0.75rem' }}>Page not found</h1>
      <p className="text-on-surface-variant text-body-lg" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/screener')}>
        Back to Screener
      </button>
    </div>
  )
}
