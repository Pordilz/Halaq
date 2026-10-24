import MaterialIcon from './MaterialIcon'

export default function AppLoader({ label = 'Loading…' }) {
  return (
    <div role="status" aria-live="polite" className="status-screen status-screen--loader">
      <MaterialIcon name="refresh" className="spinner text-primary" size={32} />
      <span className="text-body-sm">{label}</span>
    </div>
  )
}
