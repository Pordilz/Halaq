import { useEffect } from 'react'

/**
 * Lightweight document.title + meta description manager.
 * Avoids react-helmet for the bundle footprint.
 */
export default function useDocumentTitle(title, description) {
  useEffect(() => {
    const previousTitle = document.title
    const fullTitle = title
      ? `${title} · Halaq`
      : 'Halaq — Shariah Stock Screener'
    document.title = fullTitle

    let descMeta = null
    if (description) {
      descMeta = document.querySelector('meta[name="description"]')
      if (descMeta) descMeta.setAttribute('content', description)
    }

    return () => {
      document.title = previousTitle
    }
  }, [title, description])
}
