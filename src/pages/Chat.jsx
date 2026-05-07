import MaterialIcon from '../components/MaterialIcon'
import useDocumentTitle from '../hooks/useDocumentTitle'

export default function Chat() {
  useDocumentTitle('AI Shariah Companion', 'Get answers to Islamic finance questions from an AI trained on AAOIFI.')

  return (
    <div className="container animate-entrance" style={{ paddingTop: '4rem', paddingBottom: 'var(--space-12)' }}>
      <div className="max-w-xl mx-auto">
        <div
          className="card-standard"
          style={{
            padding: '3rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '9999px',
              background: 'rgba(138, 101, 0, 0.10)',
              color: 'var(--color-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcon name="forum" size={32} fill />
          </div>

          <span
            style={{
              background: 'var(--color-tertiary-container)',
              color: 'var(--color-on-tertiary-container)',
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              fontSize: 'var(--text-micro)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              lineHeight: 1,
            }}
          >
            Coming soon
          </span>

          <h1 className="text-h1">AI Shariah companion</h1>
          <p className="text-on-surface-variant text-body-lg" style={{ maxWidth: '34rem', lineHeight: 1.6 }}>
            Our chatbot is being trained on the AAOIFI Shariah-standards framework
            to answer your complex Islamic finance and compliance questions.
          </p>

          <div
            style={{
              width: '100%',
              textAlign: 'left',
              backgroundColor: 'var(--color-surface-container-low)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-2xl)',
              marginTop: 'var(--space-2)',
            }}
          >
            <h3 className="text-h3 flex-row gap-2 mb-4" style={{ alignItems: 'center' }}>
              <MaterialIcon name="lock" size={20} className="text-secondary" />
              Scholar feature
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Direct chat about specific rulings',
                'Halal alternative stock suggestions',
                'Automated document drafting',
              ].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: 'var(--text-body-sm)', color: 'var(--color-on-surface-variant)' }}>
                  <MaterialIcon name="check_circle" className="text-secondary" size={18} fill style={{ marginTop: '1px', flexShrink: 0 }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
