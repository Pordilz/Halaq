// Sentence-case verdict names for prose ("was Compliant").
export const VERDICT_LABELS = {
  COMPLIANT: 'Compliant',
  NON_COMPLIANT: 'Non-compliant',
  REVIEW_REQUIRED: 'Needs review',
  UNVERIFIED: 'Unverified',
  DOUBTFUL: 'Unverified',
}

export const verdictLabel = status => VERDICT_LABELS[status] || 'Unscreened'
