/**
 * Username helpers — keep client-side validation in lock-step with the
 * `profiles_username_format_check` constraint in 004_add_username.sql.
 */

export const USERNAME_MIN = 3
export const USERNAME_MAX = 20
const USERNAME_RE = /^[a-z0-9_]+$/

/**
 * Returns the canonical (lowercased) username if valid, otherwise null.
 */
export function normalizeUsername(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return null
  return trimmed
}

/**
 * Returns null if valid, otherwise a human-readable error string.
 */
export function validateUsername(raw) {
  const value = normalizeUsername(raw)
  if (!value) return 'Username is required.'
  if (value.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`
  if (value.length > USERNAME_MAX) return `At most ${USERNAME_MAX} characters.`
  if (!USERNAME_RE.test(value)) return 'Only letters, numbers and underscores.'
  return null
}

/**
 * The display name to show in the UI for a given (profile, user) pair.
 * Order: username → full_name → email-prefix → 'there'.
 */
export function displayName(profile, user) {
  if (profile?.username) return profile.username
  if (profile?.full_name) return profile.full_name
  const email = profile?.email || user?.email
  if (email && typeof email === 'string') return email.split('@')[0]
  return 'there'
}

/**
 * Initials for the avatar chip.
 */
export function displayInitials(profile, user) {
  if (profile?.username) return profile.username.charAt(0).toUpperCase()
  if (profile?.full_name) return profile.full_name.charAt(0).toUpperCase()
  const email = profile?.email || user?.email
  if (email && typeof email === 'string') return email.charAt(0).toUpperCase()
  return 'H'
}

/**
 * First-name / first-token for greetings ("Hi {x}").
 */
export function displayFirstToken(profile, user) {
  if (profile?.username) return profile.username
  if (profile?.full_name) return profile.full_name.split(' ')[0]
  const email = profile?.email || user?.email
  if (email && typeof email === 'string') return email.split('@')[0]
  return 'there'
}
