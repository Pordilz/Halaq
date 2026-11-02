import { NavLink } from 'react-router'
import './ScreenerSwitch.css'

/** Moves between the stock and job screeners, which share one tab. */
export default function ScreenerSwitch() {
  return (
    <nav className="screener-switch" aria-label="What to screen">
      <NavLink to="/screener" className="screener-switch__item">Stocks</NavLink>
      <NavLink to="/jobs" className="screener-switch__item">Jobs</NavLink>
    </nav>
  )
}
