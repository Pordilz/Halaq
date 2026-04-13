import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import MaterialIcon from '../components/MaterialIcon'
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
      <div className="container animate-entrance" style={{ paddingTop: '5rem', paddingBottom: 'var(--space-12)' }}>
        <div className="max-w-xl mx-auto">
          <div className="card-standard text-center flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary-container/30 text-primary flex items-center justify-center mb-6">
              <MaterialIcon name="layers" size={32} />
            </div>
            
            <div className="bg-primary px-3 py-1 rounded-full text-on-primary text-micro font-bold uppercase tracking-widest mb-4">
              Requires Upgrade
            </div>
            
            <h1 className="text-h1 mb-4">Batch Screening</h1>
            <p className="text-on-surface-variant text-body-lg mb-8">
              Analyze up to 20 portfolios at once. Batch screening is exclusively available to Pro and Scholar members.
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button className="btn btn-primary">Upgrade Plan</button>
            </div>
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
            {loading ? <><MaterialIcon name="refresh" className="spinner" size={18}/> Screening...</> : <><MaterialIcon name="search" size={18} /> Run Batch Screen</>}
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
                      if (!ratio) return 'N/A';
                      return `${(ratio.value * 100).toFixed(1)}%`;
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
