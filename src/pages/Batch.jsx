import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Layers, Search, AlertCircle, Loader2 } from 'lucide-react'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import ComplianceBadge from '../components/ComplianceBadge'
import './Batch.css'

export default function Batch() {
  const { isPro } = useAuth()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  async function handleBatch(e) {
    e.preventDefault()
    if (!input.trim()) return

    const tickers = input.split(/[\s,]+/).map(t => t.trim().toUpperCase()).filter(Boolean)
    if (tickers.length === 0) return

    // Limit to 20
    const limitedTickers = tickers.slice(0, 20)

    setLoading(true)
    const newResults = []

    for (const t of limitedTickers) {
      try {
        const data = await fetchAllScreeningData(t)
        const result = screenStock(data.profile, data.balanceSheet, data.income)
        newResults.push(result)
      } catch (err) {
        newResults.push({ ticker: t, error: true, statusReason: 'Data not found or error fetching data' })
      }
    }

    setResults(newResults)
    setLoading(false)
  }

  if (!isPro) {
    return (
      <div className="container animate-fade-in-up" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <Layers size={64} style={{ color: 'var(--color-primary-muted)', margin: '0 auto 24px' }} />
        <h1>Pro Feature</h1>
        <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto 24px' }}>
          Batch screening is exclusively available to Pro and Scholar members.
        </p>
      </div>
    )
  }

  return (
    <div className="batch-page">
      <div className="container">
        <div className="batch-header animate-fade-in-up">
          <h1>Batch Screening</h1>
          <p className="text-muted">Screen up to 20 tickers at once. Enter JSE or US tickers separated by commas or spaces.</p>
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
            {loading ? <><Loader2 size={18} className="spinner"/> Screening...</> : <><Search size={18} /> Run Batch Screen</>}
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
                          <td colSpan="6" style={{ color: 'var(--color-danger)' }}>
                            <AlertCircle size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            Error fetching data
                          </td>
                        </tr>
                      )
                    }

                    const getRatioValue = (name) => {
                      const ratio = r.financialScreen.ratios.find(rate => rate.name.includes(name));
                      return ratio ? ratio.ratioPercent : 'N/A';
                    }

                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 'bold' }}>{r.ticker}</td>
                        <td className="batch-company-name" title={r.companyName}>{r.companyName}</td>
                        <td><ComplianceBadge status={r.status} /></td>
                        <td>{getRatioValue('Leverage')}</td>
                        <td>{getRatioValue('Liquidity')}</td>
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
