import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import ComplianceBadge from '../components/ComplianceBadge'
import useDocumentTitle from '../hooks/useDocumentTitle'
import './Batch.css'

const MAX_TICKERS = 20

export default function Batch() {
  const { isPro } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useDocumentTitle('Batch screening', 'Screen up to 20 stocks at once for Shariah compliance.')

  async function handleBatch(e) {
    e.preventDefault()
    if (!input.trim()) return

    const tickers = Array.from(new Set(
      input.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean)
    )).slice(0, MAX_TICKERS)
    if (tickers.length === 0) return

    setLoading(true)
    setResults([])
    setProgress({ done: 0, total: tickers.length })

    // Run in parallel chunks of 4 to keep Yahoo Finance happy
    const chunkSize = 4
    const collected = []
    for (let i = 0; i < tickers.length; i += chunkSize) {
      const chunk = tickers.slice(i, i + chunkSize)
      const settled = await Promise.allSettled(
        chunk.map(async (t) => {
          const data = await fetchAllScreeningData(t)
          return screenStock(data.profile, data.balanceSheet, data.income)
        })
      )
      settled.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          collected.push(res.value)
        } else {
          collected.push({
            ticker: chunk[idx],
            error: true,
            statusReason: res.reason?.message || 'Could not fetch data',
          })
        }
      })
      setResults([...collected])
      setProgress({ done: collected.length, total: tickers.length })
    }

    setLoading(false)
  }

  if (!isPro) {
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
                background: 'rgba(26, 107, 71, 0.10)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcon name="layers" size={32} />
            </div>

            <span
              style={{
                background: 'var(--color-primary)',
                color: 'var(--color-white)',
                padding: '0.375rem 0.875rem',
                borderRadius: '9999px',
                fontSize: 'var(--text-micro)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                lineHeight: 1,
              }}
            >
              Pro feature
            </span>

            <h1 className="text-h1">Batch screening</h1>
            <p className="text-on-surface-variant text-body-lg" style={{ maxWidth: '32rem' }}>
              Analyse up to {MAX_TICKERS} tickers at once. Batch screening is available to Pro and Scholar members.
            </p>
            <button type="button" className="btn btn-primary btn--lg" onClick={() => navigate('/upgrade?tier=pro')}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="batch-page">
      <div className="container">
        <div className="text-center mb-10 max-w-2xl mx-auto animate-fade-in-up">
          <h1 className="text-h1 mb-3">Batch Screening</h1>
          <p className="text-on-surface-variant text-body-lg">Screen up to 20 tickers at once. Enter JSE or US tickers separated by commas, spaces, or newlines.</p>
        </div>

        <form onSubmit={handleBatch} className="batch-form animate-fade-in-up delay-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"AAPL, MSFT\nSBK.JO\nMTN.JO"}
            className="batch-input"
            rows={4}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            {loading ? (
              <>
                <MaterialIcon name="refresh" className="spinner" size={18}/>
                Screening {progress.done}/{progress.total}…
              </>
            ) : (
              <>
                <MaterialIcon name="search" size={18} /> Run batch screen
              </>
            )}
          </button>
        </form>

        {results.length > 0 && (
          <div className="batch-results animate-fade-in-up delay-2">
            <div className="card batch-table-container">
              <table className="batch-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Debt / MCap</th>
                    <th>Cash / MCap</th>
                    <th>Recv / MCap</th>
                    <th>Haram Inc</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    if (r.error) {
                      return (
                        <tr key={i} className="batch-row-error">
                          <td style={{ fontWeight: 'bold' }}>{r.ticker}</td>
                          <td colSpan="6" className="text-error">
                            <MaterialIcon name="error" size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            Error fetching data
                          </td>
                        </tr>
                      )
                    }

                    const getRatioValue = (name) => {
                      const ratio = r.financialScreen.ratios.find(rate => rate.name.includes(name));
                      if (!ratio || ratio.error || ratio.ratio == null) return 'N/A';
                      return `${(ratio.ratio * 100).toFixed(1)}%`;
                    }

                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{r.ticker}</td>
                        <td className="batch-company-name" title={r.companyName}>{r.companyName}</td>
                        <td><ComplianceBadge status={r.status} /></td>
                        <td>{getRatioValue('Debt')}</td>
                        <td>{getRatioValue('Cash')}</td>
                        <td>{getRatioValue('Receivables')}</td>
                        <td>{getRatioValue('Haram')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
