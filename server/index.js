/**
 * Halaq API Server
 * Lightweight Express proxy for Yahoo Finance data.
 * Runs alongside Vite dev server.
 */

import express from 'express';
import cors from 'cors';
import YahooFinance from 'yahoo-finance2';
import { lemonSqueezySetup, createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';


const app = express();
const PORT = process.env.PORT || 3005;

lemonSqueezySetup({ apiKey: process.env.LEMON_SQUEEZY_API_KEY });
// We reuse the 'stripe_subscription_id' column for generic subscription tracking to avoid another SQL migration
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || 'http://localhost:54321', // fallback to local mock
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon-key-placeholder'
);


const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey']
});

app.use(cors());

// Middleware: verify Supabase JWT and attach user + profile to req
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' });
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  req.user = user;
  req.profile = profile || { subscription_tier: 'free' };
  next();
}

async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (user) {
    req.user = user;
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    req.profile = profile;
  }
  next();
}

const anonLimits = new Map(); // Simple in-memory tracker for anon IPs

// Middleware: enforce tier access
function requireTier(...tiers) {
  return (req, res, next) => {
    const tierOrder = { free: 0, pro: 1, scholar: 2 };
    const userTier = req.profile?.subscription_tier || 'free';
    const minRequired = Math.min(...tiers.map(t => tierOrder[t]));
    if (tierOrder[userTier] >= minRequired) return next();
    return res.status(403).json({
      error: 'upgrade_required',
      required_tier: tiers[0],
      message: `This feature requires a ${tiers[0]} subscription.`
    });
  };
}

// Helper: log AI usage
async function logAIUsage(userId, feature, ticker, tokensUsed) {
  await supabaseAdmin.from('ai_usage_log').insert({
    user_id: userId, feature, ticker, tokens_used: tokensUsed
  });
}

// POST /api/lemonsqueezy/webhook
// IMPORTANT: This route needs raw body — add before express.json() middleware
app.post('/api/lemonsqueezy/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('--- [WEBHOOK] Received Lemon Squeezy Event ---');
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];
  
  if (!signature) {
    console.error('[WEBHOOK ERROR] Missing x-signature header');
    return res.status(401).send('Missing signature');
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
    console.error('[WEBHOOK ERROR] Invalid signature mismatch');
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  
  console.log(`[WEBHOOK EVENT] ${eventName}`);
  const userId = customData?.supabase_user_id;
  console.log(`[WEBHOOK USER_ID] ${userId || 'Missing'}`);

  if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
    const sub = payload.data.attributes;
    const status = sub.status; // 'active', 'past_due', 'canceled', etc.
    const tierMap = {
      [process.env.LEMON_PRO_VARIANT_ID]: 'pro',
      [process.env.LEMON_SCHOLAR_VARIANT_ID]: 'scholar'
    };
    const newTier = (status === 'active' || status === 'on_trial') ? (tierMap[sub.variant_id] || 'free') : 'free';

    if (userId) {
      console.log(`[WEBHOOK DB] Updating profile ${userId} to tier: ${newTier}`);
      const { error } = await supabaseAdmin.from('profiles').update({
        subscription_tier: newTier,
        stripe_subscription_id: payload.data.id,
        subscription_status: status,
        subscription_period_end: new Date(sub.renews_at).toISOString()
      }).eq('id', userId);
      
      if (error) console.error('[WEBHOOK ERROR] Supabase Update Failed:', error);
      else console.log('[WEBHOOK SUCCESS] Profile updated!');
    }
  } else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
    const sub = payload.data.attributes;
    if (userId) {
      console.log(`[WEBHOOK DB] Cancelling profile ${userId}`);
      await supabaseAdmin.from('profiles').update({
        subscription_tier: 'free',
        subscription_status: 'cancelled',
        stripe_subscription_id: null
      }).eq('id', userId);
    }
  }

  res.status(200).json({ received: true });
});

app.use(express.json());

// POST /api/lemonsqueezy/create-checkout
app.post('/api/lemonsqueezy/create-checkout', requireAuth, async (req, res) => {
  const { tier } = req.body;
  const user = req.user;
  const variantId = tier === 'scholar' ? process.env.LEMON_SCHOLAR_VARIANT_ID : process.env.LEMON_PRO_VARIANT_ID;

  try {
    const newCheckout = await createCheckout(process.env.LEMON_SQUEEZY_STORE_ID, variantId, {
      checkoutData: {
        email: user.email,
        custom: {
          supabase_user_id: user.id,
          tier: tier
        }
      },
      productOptions: {
        redirectUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings?upgrade=success`,
        receiptButtonText: 'Return to Halaq',
        receiptLinkUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/settings`
      }
    });

    res.json({ url: newCheckout.data?.data?.attributes?.url });
  } catch (error) {
    console.error('Lemon Squeezy checkout error:', error);
    res.status(500).json({ error: 'Unable to start checkout session' });
  }
});

// POST /api/lemonsqueezy/create-portal
app.post('/api/lemonsqueezy/create-portal', requireAuth, async (req, res) => {
  const subId = req.profile.stripe_subscription_id; 
  if (!subId) return res.status(400).json({ error: 'No subscription found' });

  try {
    const sub = await getSubscription(subId);
    if (sub.error) throw new Error(sub.error.message);
    const url = sub.data?.data?.attributes?.urls?.customer_portal;
    if (!url) {
      console.error('[Portal Error] No URL returned for subId:', subId, sub.data);
      throw new Error('Customer portal URL not generated by Lemon Squeezy');
    }
    res.json({ url });
  } catch (error) {
    console.error('Portal error:', error.message || error);
    res.status(500).json({ error: error.message || 'Unable to open billing portal' });
  }
});

/**
 * Parse YF numeric values (handles null / undefined)
 */
function num(val) {
  if (val === null || val === undefined) return 0;
  return Number(val) || 0;
}

/**
 * GET /api/screen/:ticker
 * Returns normalized profile, income statement, and balance sheet data
 */
app.get('/api/screen/:ticker', optionalAuth, async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  // Rate Limiter
  if (req.user && req.profile) {
    if (req.profile.subscription_tier === 'free') {
      const now = new Date();
      const resetAt = new Date(req.profile.daily_search_reset_at || now.toISOString());
      let count = req.profile.daily_search_count || 0;
      
      // If 24 hours have passed since the last reset epoch
      if (now > new Date(resetAt.getTime() + 24 * 60 * 60 * 1000)) {
        count = 0;
      }
      
      if (count >= 5) {
        return res.status(429).json({ error: "Daily screening limit reached (5/5). Please upgrade to Pro for unlimited access." });
      }
      
      // Update DB asynchronously so we don't block the request ping mapping
      supabaseAdmin.from('profiles').update({
        daily_search_count: count + 1,
        daily_search_reset_at: count === 0 ? now.toISOString() : req.profile.daily_search_reset_at
      }).eq('id', req.user.id).then();
    }
  } else {
    // Unauthenticated user
    const ip = req.ip || req.connection.remoteAddress;
    const count = anonLimits.get(ip) || 0;
    if (count >= 3) {
      return res.status(429).json({ error: "Anonymous tier limit reached. Please log in for more free queries, or upgrade to Pro." });
    }
    anonLimits.set(ip, count + 1);
  }

  try {
    // Fetch quote summary (profile + ratios) and fundamental time series (for financials)
    // We get the past ~2 years of data to ensure we have the most recent annual statements.
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

    // ---- PROFILE ----
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

    // Attempt to extract the latest annual figures from the fundamentals timeseries
    // FundamentalsTimeSeries returns an array of data points. We sort by date descending.
    const sortedSeries = [...timeSeries].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const latestFinancials = sortedSeries[0] || {};
    const latestDate = latestFinancials?.date || null;

    // ---- INCOME STATEMENT ----
    // Interest data field priority (verified across AAPL, MSFT, JNJ):
    //   Most specific:  interestIncome / interestIncomeNonOperating (MSFT, JNJ have these)
    //   Broader proxy:  otherNonOperatingIncomeExpenses (AAPL only has this)
    //   Net interest:   netInterestIncome / netNonOperatingInterestIncomeExpense
    const interestIncome = num(latestFinancials.interestIncome)
      || num(latestFinancials.interestIncomeNonOperating)
      || 0;

    const interestExpense = num(latestFinancials.interestExpense)
      || num(latestFinancials.interestExpenseNonOperating)
      || 0;
    
    // If no explicit interest fields exist, use broader non-operating income as fallback
    const nonOperatingIncome = num(latestFinancials.otherNonOperatingIncomeExpenses)
      || num(latestFinancials.otherIncomeExpense)
      || 0;

    // For non-US stocks (e.g. JSE) where NO interest data is available at all,
    // estimate interest expense from totalDebt × average market interest rate (~5%)
    const debtForEstimate = num(latestFinancials.totalDebt) || num(financialData.totalDebt);
    let estimatedInterestExpense = 0;
    let dataSource = 'unavailable';

    if (interestIncome > 0 || interestExpense > 0) {
      dataSource = 'explicit';
    } else if (nonOperatingIncome !== 0) {
      dataSource = 'estimated';
    } else if (debtForEstimate > 0) {
      // Conservative estimate: 5% average cost of debt
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
      // Use specific interest fields when available; then non-operating proxy; then debt-derived estimate
      interestIncome: interestIncome || Math.max(nonOperatingIncome, 0),
      interestExpense: interestExpense || estimatedInterestExpense,
      // Provide a confidence flag for the frontend
      interestDataSource: dataSource,
    };

    // ---- BALANCE SHEET ----
    const cash = num(latestFinancials.cashAndCashEquivalents) + num(latestFinancials.otherShortTermInvestments) 
      || num(financialData.totalCash);
    
    // totalDebt in timeseries, else financialData
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

    res.json({ profile, income, balanceSheet });
  } catch (err) {
    console.error(`[Halaq API] Error screening ${ticker}:`, err.message);

    // Determine appropriate error message
    let message = err.message;
    if (message.includes('Not Found') || message.includes('no fundamentals')) {
      message = `No data found for ticker "${ticker}". Check the symbol and try again.`;
    } else if (message.includes('Schema') || message.includes('validation')) {
      message = `Yahoo Finance returned unexpected data for "${ticker}". This stock may have limited data available. Please try again or use a different ticker.`;
    }

    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/search?q=<query>
 * Proxies Yahoo Finance symbol search for autocomplete
 */
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) return res.json([]);

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return res.json([]);

    const data = await response.json();

    // US exchange codes + JSE (Johannesburg Stock Exchange)
    const ALLOWED_EXCHANGES = new Set(['NMS', 'NYQ', 'NGM', 'PCX', 'BTS', 'ASE', 'NAS', 'JNB']);

    const quotes = (data?.quotes || [])
      .filter(q =>
        (q.quoteType === 'EQUITY' || q.quoteType === 'ETF') &&
        (ALLOWED_EXCHANGES.has(q.exchange) || q.symbol?.endsWith('.JO'))
      )
      .slice(0, 6)
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType,
      }));

    res.json(quotes);
  } catch (err) {
    console.error('[Search] Error:', err.message);
    res.json([]);
  }
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n  🕌  Halaq API server running on http://localhost:${PORT}\n`);
});
