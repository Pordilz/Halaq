import { Link } from 'react-router'
import useDocumentTitle from '../hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found', 'This page does not exist on Halaq.')

  return (
    <div className="container status-screen status-screen--missing">
      <h1 className="status-screen__title">This page isn’t here</h1>
      <p className="status-screen__body text-body-lg">
        The link may be old, or the address mistyped. You can screen any stock from the screener.
      </p>
      <div className="status-screen__actions">
        <Link to="/screener" className="btn btn-primary btn--lg">Screen a stock</Link>
        <Link to="/" className="btn btn-ghost btn--lg">Go to the home page</Link>
      </div>
    </div>
  )
}
