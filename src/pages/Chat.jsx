import MaterialIcon from '../components/MaterialIcon'

export default function Chat() {
  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '600px', textAlign: 'center' }}>
      <div className="card card-elevated animate-fade-in-up">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-blue-soft)', display: 'inline-block', padding: '16px', borderRadius: '50%' }}>
            <MaterialIcon name="chat" size={24} className="text-secondary" />
          </div>
        </div>
        <div style={{ display: 'inline-block', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase' }}>
          Coming Soon
        </div>
        <h1 style={{ marginBottom: '1rem' }}>AI Shariah Companion</h1>
        <p className="text-muted" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
          Our AI Chatbot is being specifically trained on the AAOIFI Shariah standards framework to answer your complex Islamic finance and compliance questions.
        </p>

        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '1.5rem', textAlign: 'left', background: 'var(--color-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
            <Lock size={16} /> Exclusive Scholar Features
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Direct chat about specific rulings
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Halal alternative stock suggestions
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Automated document drafting
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
