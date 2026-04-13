import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWatchlist } from '../hooks/useWatchlist'
import { fetchAllScreeningData } from '../services/yahooFinanceApi'
import { screenStock } from '../services/complianceEngine'
import MaterialIcon from '../components/MaterialIcon'
import ComplianceBadge from '../components/ComplianceBadge'
import RatioBar from '../components/RatioBar'
import DisclaimerNotice from '../components/DisclaimerNotice'
import './StockDetail.css'

export default function StockDetail() {
  const { ticker } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { isInWatchlist, toggle: toggleWatchlist } = useWatchlist(user)
  
  const [activeTab, setActiveTab] = useState('ratios')
  const [loading, setLoading] = useState(true)

  const [stock, setStock] = useState(null)
  const [error, setError] = useState(null)

  // Monetization Feature Gate
  const isPremium = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'scholar' || profile?.subscription_tier === 'admin'
  const isPro = isPremium;

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const data = await fetchAllScreeningData(ticker)
        const complianceResult = screenStock(data.profile, data.balanceSheet, data.income)
        
        let price = data.profile.price || 0
        let currency = complianceResult.currency || 'USD'
        let formattedPrice = currency === 'ZAR' ? `R${price.toFixed(2)}` : `$${price.toFixed(2)}`
        
        setStock({
          ticker: complianceResult.ticker,
          name: complianceResult.companyName,
          sector: complianceResult.sector,
          exchange: complianceResult.exchange || 'US',
          price: formattedPrice,
          change: data.profile.regularMarketChangePercent
            ? `${data.profile.regularMarketChangePercent >= 0 ? '+' : ''}${data.profile.regularMarketChangePercent.toFixed(2)}%`
            : null,
          compliance: complianceResult.status,
          statusReason: complianceResult.statusReason,
          methodology: 'AAOIFI Standard',
          ratios: complianceResult.financialScreen.ratios.map(r => ({
             name: r.name,
             ratio: r.value,
             threshold: r.threshold,
             ratioPercent: `${(r.value * 100).toFixed(1)}%`,
             thresholdPercent: `${(r.threshold * 100).toFixed(1)}%`,
             pass: r.pass,
             desc: r.description
          })),
          businessActivity: complianceResult.businessScreen.detail,
          businessScreenStatus: complianceResult.businessScreen.status,
          businessScreenReason: complianceResult.businessScreen.reason,
          purificationRate: complianceResult.haramRevenuePercent || 0,
          dataSources: complianceResult.dataSources,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [ticker])

  if (loading) {
    return (
      <div className="stock-detail-page container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcon name="refresh" className="spinner text-primary" size={40} />
      </div>
    )
  }

  if (error || !stock) {
    return (
      <div className="stock-detail-page container" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcon name="error" className="text-error mb-4" size={48} />
        <h2 className="text-h2 mb-2">Failed to load data for {ticker}</h2>
        <p className="text-on-surface-variant text-body-lg mb-6">{error || 'Unknown error'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/screener')}>Back to Screener</button>
      </div>
    )
  }

  const getStatusBannerColor = (status) => {
    if (status === 'COMPLIANT') return 'bg-tertiary-fixed text-on-tertiary-fixed';
    if (status === 'NON_COMPLIANT') return 'bg-error-container text-on-error-container';
    return 'bg-caution-container text-on-caution-container';
  }

  const getStatusIcon = (status) => {
    if (status === 'COMPLIANT') return 'check_circle';
    if (status === 'NON_COMPLIANT') return 'cancel';
    return 'help';
  }

  return (
    <div className="stock-detail-page container">
      <div className="back-nav">
        <button onClick={() => navigate(-1)} className="back-btn focus-ghost">
          <MaterialIcon name="arrow_back" size={20} />
          Back to Screener
        </button>
      </div>

      <div className="stock-detail-layout">
         {/* Left / Main Content Column */}
         <div className="detail-main">
           
           {/* Header Card */}
           <div className="stock-hero-card card-standard">
             <div className="flex-between">
               <div className="ticker-badge">{stock.ticker}</div>
               <div className="text-right">
                  <div className="text-h3 font-tabular">{stock.price}</div>
                  {stock.change && <div className="text-tertiary font-subheading text-body-sm">{stock.change}</div>}
               </div>
             </div>
             
             <h1 className="text-h1 mt-4 mb-2 truncate">{stock.name}</h1>
             <p className="text-on-surface-variant text-body-lg">
               {stock.sector} <span className="mx-2 text-outline-variant">•</span> {stock.exchange}
             </p>
           </div>

           {/* Status Banner */}
           <div className={`status-banner ${getStatusBannerColor(stock.compliance)}`}>
             <div className="flex-row gap-3">
               <MaterialIcon name={getStatusIcon(stock.compliance)} fill size={32} />
               <div>
                  <div className="font-heading text-body-sm opacity-80 uppercase tracking-widest">{stock.methodology}</div>
                  <div className="text-h3">{stock.compliance.replace('_', '-')}</div>
               </div>
             </div>
             <div className="status-banner-action hidden md:block">
               {isPro && (
                 <button className="btn focus-ghost" style={{ background: 'rgba(255,255,255,0.2)', minHeight: '40px', padding: '0 16px' }}>
                   <MaterialIcon name="picture_as_pdf" size={20} /> Download Report
                 </button>
               )}
             </div>
           </div>

           {/* Tabs */}
           <div className="tabs-container">
             {['Overview', 'Ratios', 'Business', 'Purification'].map(tab => (
               <button 
                 key={tab} 
                 className={`tab-btn ${activeTab === tab.toLowerCase() ? 'active' : ''}`}
                 onClick={() => setActiveTab(tab.toLowerCase())}
               >
                 {tab}
               </button>
             ))}
           </div>

           {/* Tab Content */}
           <div className="tab-content relative">
             {/* Monetization Gate Overlay */}
             {!isPro && activeTab !== 'overview' && (
               <div className="premium-gate-overlay glass-panel-dark">
                  <MaterialIcon name="lock" fill className="text-primary mb-4" size={48} />
                  <h3 className="text-h2 mb-2 text-center">Premium Feature</h3>
                   <p className="text-on-surface-variant text-center max-w-md mb-6">
                     See exactly why {stock.ticker} passed or failed. Pro users get full transparency into financial ratios, debt calculations, and business activity screens.
                   </p>
                   <button className="btn btn-primary" onClick={() => navigate('/profile')}>
                     Upgrade to Pro
                  </button>
               </div>
             )}

             {/* Ratios Tab */}
             <div className={`tab-pane ${activeTab === 'ratios' ? 'active' : ''}`}>
               <h3 className="text-h3 mb-4">Financial Screen</h3>
               <div className="grid-1 md:grid-2 gap-4">
                 {stock.ratios.map(r => (
                   <RatioBar key={r.name} {...r} />
                 ))}
               </div>
             </div>

             {/* Business Tab */}
              <div className={`tab-pane ${activeTab === 'business' ? 'active' : ''}`}>
                <h3 className="text-h3 mb-4">Business Activity Screen</h3>
                <div className="card-standard p-6">
                  <div className="flex-row gap-3 mb-4 pb-4 border-b border-outline-variant-15">
                    <div className={`p-2 rounded-full ${stock.businessScreenStatus === 'PASS' ? 'bg-tertiary-fixed text-tertiary' : stock.businessScreenStatus === 'FAIL' ? 'bg-error-container text-error' : 'bg-caution-container text-on-caution-container'}`}>
                      <MaterialIcon name={stock.businessScreenStatus === 'PASS' ? 'check' : stock.businessScreenStatus === 'FAIL' ? 'close' : 'help'} fill size={20} />
                    </div>
                    <div>
                      <div className="font-heading text-body-lg">
                        {stock.businessScreenStatus === 'PASS' ? 'Core Business is Permissible' : stock.businessScreenStatus === 'FAIL' ? 'Core Business is Non-Permissible' : 'Business Requires Further Review'}
                      </div>
                      <div className="text-on-surface-variant text-body-sm">{stock.businessScreenReason}</div>
                    </div>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    {stock.businessActivity}
                  </p>
                </div>
              </div>

             {/* Purification Tab */}
             <div className={`tab-pane ${activeTab === 'purification' ? 'active' : ''}`}>
               <h3 className="text-h3 mb-4">Dividend Purification</h3>
                <div className="card-standard p-6">
                  <div className="flex-between mb-2">
                    <span className="text-on-surface-variant font-heading">Purification Rate</span>
                    <span className="text-h2 font-tabular">{typeof stock.purificationRate === 'number' ? `${(stock.purificationRate * 100).toFixed(1)}%` : '0.0%'}</span>
                  </div>
                 <p className="text-on-surface-variant text-body-sm mt-4">
                   You must donate this percentage of any dividend income received from {stock.ticker} to charity to purify the impermissible portion of their revenue. Do not purify capital gains.
                 </p>
               </div>
             </div>
             
             {/* Overview Tab (Always visible) */}
             <div className={`tab-pane ${activeTab === 'overview' ? 'active' : ''}`}>
                <div className="card-standard p-6 mb-6">
                  <h3 className="text-h3 mb-4">Summary</h3>
                   <p className="text-on-surface-variant">
                     {stock.name} is currently classified as <strong>{stock.compliance.replace('_', '-')}</strong> based on the latest available financial statements{stock.dataSources?.balanceSheetPeriod ? ` (${stock.dataSources.balanceSheetPeriod})` : ''}.
                   </p>
                   {stock.statusReason && (
                     <p className="text-on-surface-variant text-body-sm mt-2" style={{ opacity: 0.8 }}>
                       {stock.statusReason}
                     </p>
                   )}
                  
                  {!isPro && (
                     <div className="mt-4 p-4 bg-primary-fixed/20 rounded-xl border border-primary/20 flex-row gap-3">
                       <MaterialIcon name="info" className="text-primary" />
                       <div className="text-body-sm">
                         <strong className="text-primary">Want to see the math?</strong> Upgrade to Pro to view the exact debt ratios and business activity breakdown that led to this ruling.
                       </div>
                     </div>
                  )}
                </div>
                <DisclaimerNotice />
             </div>
           </div>
         </div>

         {/* Right / Sidebar Column (Desktop) */}
         <div className="detail-sidebar desktop-only">
           <div className="action-panel card-standard p-6 sticky top-24">
             <h4 className="text-label mb-4">Report Actions</h4>
             
             <button 
               className="btn w-full mb-3 btn-secondary"
               onClick={() => toggleWatchlist({ ticker: stock.ticker, name: stock.name, sector: stock.sector, exchange: stock.exchange })}
             >
               <MaterialIcon name={isInWatchlist(stock.ticker) ? "bookmark" : "bookmark_add"} fill={isInWatchlist(stock.ticker)} />
               {isInWatchlist(stock.ticker) ? 'Saved to Watchlist' : 'Add to Watchlist'}
             </button>
             
             <button className="btn w-full btn-secondary text-primary" style={{ background: 'transparent', boxShadow: 'none' }}>
               <MaterialIcon name="share" />
               Share Report
             </button>
           </div>
         </div>
      </div>
      
      {/* Mobile Fixed Footer Actions */}
      <div className="mobile-detail-footer mobile-only glass-panel">
         <button 
           className="btn btn-secondary flex-1"
           onClick={() => toggleWatchlist({ ticker: stock.ticker, name: stock.name, sector: stock.sector, exchange: stock.exchange })}
         >
           <MaterialIcon name={isInWatchlist(stock.ticker) ? "bookmark" : "bookmark_add"} fill={isInWatchlist(stock.ticker)} />
           {isInWatchlist(stock.ticker) ? 'Saved' : 'Watchlist'}
         </button>
      </div>
    </div>
  )
}
