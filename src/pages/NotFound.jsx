import { useNavigate } from 'react-router-dom'
import MaterialIcon from '../components/MaterialIcon'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="container status-screen">
      <div className="status-screen__code" aria-hidden="true">404</div>
      <MaterialIcon name="explore_off" size={48} className="text-outline-variant" />
      <h1 className="text-h2">Page not found</h1>
      <p className="status-screen__body text-on-surface-variant text-body-lg">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button type="button" className="btn btn-primary" onClick={() => navigate('/screener')}>
        Back to Screener
      </button>
    </div>
  )
}
