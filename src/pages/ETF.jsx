import MaterialIcon from '../components/MaterialIcon'

export default function ETF() {
  return (
    <div className="container animate-entrance" style={{ paddingTop: '5rem', paddingBottom: 'var(--space-12)' }}>
      <div className="max-w-xl mx-auto">
        <div className="card-standard text-center flex-column" style={{ alignItems: 'center' }}>
          <div className="w-16 h-16 rounded-full flex flex-row" style={{ backgroundColor: 'rgba(26, 107, 71, 0.1)', color: 'var(--color-primary)', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-6)', width: '64px', height: '64px' }}>
            <MaterialIcon name="monitoring" size={32} fill />
          </div>
          
          <div className="text-micro font-bold uppercase mb-4" style={{ backgroundColor: 'var(--color-tertiary-container)', color: 'var(--color-on-tertiary-container)', padding: '0.25rem 1rem', borderRadius: '9999px', letterSpacing: '0.1em' }}>
            Coming Soon
          </div>
          
          <h1 className="text-h1 mb-4 text-on-surface">ETF X-Ray Scanner</h1>
          <p className="text-on-surface-variant text-body-lg mb-8 leading-relaxed">
            We are currently building internal holding extraction to automatically assess ETF Shariah compliance. This feature will let you scan the contents of popular index funds.
          </p>

          <div className="w-full text-left" style={{ backgroundColor: 'var(--color-surface-container-low)', padding: 'var(--space-6)', borderRadius: 'var(--radius-2xl)', border: '1px solid rgba(15, 26, 39, 0.05)' }}>
            <h3 className="text-h3 flex-row gap-2 mb-4">
              <MaterialIcon name="lock" size={20} className="text-primary" /> 
              Exclusive Scholar Feature
            </h3>
            <ul className="flex-column gap-3 text-body-sm text-on-surface-variant" style={{ listStyle: 'none', padding: 0 }}>
              <li className="flex-row gap-3">
                <MaterialIcon name="check_circle" className="text-primary" size={18} fill /> 
                <span>Breakdown of Top 50 ETF holdings</span>
              </li>
              <li className="flex-row gap-3">
                <MaterialIcon name="check_circle" className="text-primary" size={18} fill /> 
                <span>Aggregate ETF Compliance Score</span>
              </li>
              <li className="flex-row gap-3">
                <MaterialIcon name="check_circle" className="text-primary" size={18} fill /> 
                <span>Weighted Haram Income Purification</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
