import React from 'react'
import MaterialIcon from './MaterialIcon'
import { isChunkLoadError, reloadForNewBuild } from '../lib/chunkReload'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // A page chunk from a previous deploy: reload into the current build.
    if (isChunkLoadError(error) && reloadForNewBuild()) return
    if (typeof console !== 'undefined') {
      console.error('[Halaq] Unhandled UI error:', error, info)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="container status-screen" role="alert">
        <MaterialIcon name="error_outline" size={48} className="text-error" />
        <h1 className="text-h2">Something went wrong</h1>
        <p className="status-screen__body text-on-surface-variant text-body-lg">
          We hit an unexpected error rendering this page. Try refreshing — if it
          persists, please report it so we can investigate.
        </p>
        <div className="status-screen__actions">
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh page
          </button>
          <button type="button" className="btn btn-secondary" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
