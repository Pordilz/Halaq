/**
 * Halaq brand mark — crescent moon + chart bars + upward arrow.
 * Inherits its colour from `currentColor`. Pass a tailored `color` prop for
 * coloured surfaces (e.g. white on the green hero).
 *
 * Banned: the placeholder "sparkle" path. Always use this component.
 */

export default function Logo({ size = 28, color = 'currentColor', title = 'Halaq', className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      className={className}
    >
      {title && <title>{title}</title>}
      <path
        d="M32 4C16.536 4 4 16.536 4 32s12.536 28 28 28c6.627 0 12.727-2.305 17.527-6.16C44.06 57.67 37.05 60 32 60 18.745 60 8 49.255 8 36c0-10.82 7.17-19.97 17-22.98C22.48 8.84 17.07 4 32 4z"
        fill={color}
      />
      <rect x="24" y="34" width="5" height="14" rx="1" fill={color} />
      <rect x="32" y="28" width="5" height="20" rx="1" fill={color} />
      <rect x="40" y="22" width="5" height="26" rx="1" fill={color} />
      <path
        d="M26 32L38 18l6 6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export function LogoLockup({ size = 28, color = 'var(--color-primary)', textColor, className = '' }) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        color: textColor || color,
      }}
    >
      <Logo size={size} color={color} />
      <span
        style={{
          fontSize: size >= 28 ? '1.25rem' : '1rem',
          fontWeight: 800,
          letterSpacing: '-0.025em',
        }}
      >
        Halaq
      </span>
    </span>
  )
}
