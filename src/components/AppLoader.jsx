import MaterialIcon from './MaterialIcon'

export default function AppLoader({ label = 'Loading…' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        color: 'var(--color-on-surface-variant)',
      }}
    >
      <MaterialIcon
        name="refresh"
        className="spinner text-primary"
        size={32}
      />
      <span className="text-body-sm">{label}</span>
    </div>
  )
}
