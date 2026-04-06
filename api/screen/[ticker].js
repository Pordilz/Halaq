import YahooFinance from 'yahoo-finance2';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon-key-placeholder'
);

const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

function num(val) {
  if (val === null || val === undefined) return 0;
  return Number(val) || 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ticker: queryTicker } = req.query;
  if (!queryTicker) return res.status(400).json({ error: 'Missing ticker parameter' });

  const ticker = queryTicker.toUpperCase();

  // Rate Limiting Logic (Only for Free Auth Users) - For MVP we skip Anon limits
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
      
      if (profile && profile.subscription_tier === 'free') {
        const now = new Date();
        const resetAt = new Date(profile.daily_search_reset_at || now.toISOString());
        let count = profile.daily_search_count || 0;
        
        // If 24 hours have passed since the last reset epoch
        if (now > new Date(resetAt.getTime() + 24 * 60 * 60 * 1000)) {
          count = 0;
        }
        
        if (count >= 5) {
          return res.status(429).json({ error: "Daily screening limit reached (5/5). Please upgrade to Pro for unlimited access." });
        }
        
        // Update DB asynchronously so we don't block
        supabaseAdmin.from('profiles').update({
          daily_search_count: count + 1,
          daily_search_reset_at: count === 0 ? now.toISOString() : profile.daily_search_reset_at
        }).eq('id', user.id).then();
      }
    }
  }

  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const [quote, timeSeries] = await Promise.all([
      yahooFinance.quoteSummary(ticker, {
        modules: [
          'assetProfile',
          'summaryDetail',
          'price',
          'defaultKeyStatistics',
          'financialData',
        ],
      }, { validateResult: false }),
      yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: twoYearsAgo.toISOString().split('T')[0],
        module: 'all',
      }, { validateResult: false }),
    ]);

    const priceData = quote.price || {};
    const assetProfile = quote.assetProfile || {};
    const financialData = quote.financialData || {};

    const profile = {
      ticker: ticker,
      name: priceData.longName || priceData.shortName || ticker,
      sector: assetProfile.sector || '',
      industry: assetProfile.industry || '',
      exchange: priceData.exchangeName || priceData.exchange || '',
      marketCap: num(priceData.marketCap),
      currency: priceData.currency || 'USD',
      description: assetProfile.longBusinessSummary || '',
      country: assetProfile.country || '',
    };

    const sortedSeries = [...timeSeries].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const latestFinancials = sortedSeries[0] || {};
    const latestDate = latestFinancials?.date || null;

    const interestIncome = num(latestFinancials.interestIncome)
      || num(latestFinancials.interestIncomeNonOperating)
      || 0;

    const interestExpense = num(latestFinancials.interestExpense)
      || num(latestFinancials.interestExpenseNonOperating)
      || 0;
    
    const nonOperatingIncome = num(latestFinancials.otherNonOperatingIncomeExpenses)
      || num(latestFinancials.otherIncomeExpense)
      || 0;

    const debtForEstimate = num(latestFinancials.totalDebt) || num(financialData.totalDebt);
    let estimatedInterestExpense = 0;
    let dataSource = 'unavailable';

    if (interestIncome > 0 || interestExpense > 0) {
      dataSource = 'explicit';
    } else if (nonOperatingIncome !== 0) {
      dataSource = 'estimated';
    } else if (debtForEstimate > 0) {
      estimatedInterestExpense = debtForEstimate * 0.05;
      dataSource = 'debt-derived';
    }

    const totalRevenue = num(latestFinancials.totalRevenue) || num(financialData.totalRevenue);

    const income = {
      period: latestDate ? new Date(latestDate).toISOString().split('T')[0] : 'N/A',
      revenue: totalRevenue,
      netIncome: num(latestFinancials.netIncomeFromContinuingOperations) || num(latestFinancials.netIncome),
      grossProfit: num(latestFinancials.grossProfit) || num(financialData.grossProfits),
      operatingIncome: num(latestFinancials.operatingIncome),
      interestIncome: interestIncome || Math.max(nonOperatingIncome, 0),
      interestExpense: interestExpense || estimatedInterestExpense,
      interestDataSource: dataSource,
    };

    const cash = num(latestFinancials.cashAndCashEquivalents) + num(latestFinancials.otherShortTermInvestments) 
      || num(financialData.totalCash);
    
    const shortTermDebt = num(latestFinancials.currentDebt) || 0;
    const longTermDebt = num(latestFinancials.longTermDebt) || 0;
    const totalDebt = num(latestFinancials.totalDebt) || (shortTermDebt + longTermDebt) || num(financialData.totalDebt);

    const balanceSheet = {
      period: latestDate ? new Date(latestDate).toISOString().split('T')[0] : 'N/A',
      totalDebt: totalDebt,
      cashAndShortTermInvestments: cash,
      cashAndCashEquivalents: num(latestFinancials.cashAndCashEquivalents),
      netReceivables: num(latestFinancials.accountsReceivable) || num(latestFinancials.netReceivables),
      totalAssets: num(latestFinancials.totalAssets),
      totalLiabilities: num(latestFinancials.totalLiabilities) || num(latestFinancials.totalLiabilitiesNetMinorityInterest) || num(latestFinancials.totalDebt),
    };

    res.status(200).json({ profile, income, balanceSheet });
  } catch (err) {
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);

    let message = err.message;
    if (message.includes('Not Found') || message.includes('no fundamentals')) {
      message = `No data found for ticker "${ticker}". Check the symbol and try again.`;
    } else if (message.includes('Schema') || message.includes('validation')) {
      message = `Yahoo Finance returned unexpected data for "${ticker}". This stock may have limited data available. Please try again or use a different ticker.`;
    }

    res.status(400).json({ error: message });
  }
}
