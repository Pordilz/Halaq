import React from 'react'
import MaterialIcon from './MaterialIcon'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
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
      <div
        className="container"
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <MaterialIcon
          name="error_outline"
          size={48}
          className="text-error mb-4"
        />
        <h1 className="text-h2" style={{ marginBottom: '0.75rem' }}>
          Something went wrong
        </h1>
        <p
          className="text-on-surface-variant text-body-lg"
          style={{ maxWidth: '480px', marginBottom: '2rem' }}
        >
          We hit an unexpected error rendering this page. Try refreshing — if it
          persists, please report it so we can investigate.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
          <button className="btn btn-secondary" onClick={this.handleReset}>
            Try again
          </button>
        </div>
      </div>
    )
  }
}
