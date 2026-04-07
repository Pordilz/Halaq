import MaterialIcon from '../components/MaterialIcon'

export default function ETF() {
  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '600px', textAlign: 'center' }}>
      <div className="card card-elevated animate-fade-in-up">
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-purple-soft)', display: 'inline-block', padding: '16px', borderRadius: '50%' }}>
            <MaterialIcon name="activity" size={24} className="text-secondary" />
          </div>
        </div>
        <div style={{ display: 'inline-block', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '1rem', textTransform: 'uppercase' }}>
          Coming Soon
        </div>
        <h1 style={{ marginBottom: '1rem' }}>ETF X-Ray Scanner</h1>
        <p className="text-muted" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
          We are currently building internal holding extraction to automatically assess ETF Shariah compliance. This feature will let you scan the contents of popular index funds.
        </p>

        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: '1.5rem', textAlign: 'left', background: 'var(--color-bg)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)' }}>
            <Lock size={16} /> Exclusive Scholar Features
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Breakdown of Top 50 ETF holdings
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Aggregate ETF Compliance Score
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: 'var(--color-primary)' }}>✓</div> Weighted Haram Income Purification
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
