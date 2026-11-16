import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appSource = readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8')
const routes = new Set(
  [...appSource.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1]),
)

test('App.jsx declares the key application routes', () => {
  for (const route of [
    '/',
    '/login',
    '/signup',
    '/home',
    '/screener',
    '/jobs',
    '/stock/:ticker',
    '/learn',
    '/upgrade',
    '/watchlist',
    '/profile',
    '/batch',
    '/etf',
    '/etf/:ticker',
    '/chat',
    '/legal',
    '/legal/:slug',
    '*',
  ]) {
    assert.ok(routes.has(route), `missing route ${route}`)
  }
})

test('App.jsx imports the key page components', () => {
  const pages = new Set(
    [...appSource.matchAll(/pages\/([A-Za-z]+)['"]/g)].map((m) => m[1]),
  )
  for (const page of [
    'Landing',
    'Home',
    'Screener',
    'Jobs',
    'StockDetail',
    'Login',
    'Signup',
    'Watchlist',
    'Learn',
    'Profile',
    'Batch',
    'ETF',
    'Chat',
    'Upgrade',
    'Legal',
    'NotFound',
  ]) {
    assert.ok(pages.has(page), `missing page import ${page}`)
  }
})
