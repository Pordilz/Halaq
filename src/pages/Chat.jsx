import FeatureGate from '../components/FeatureGate'
import useDocumentTitle from '../hooks/useDocumentTitle'

export default function Chat() {
  useDocumentTitle('AI Companion', 'Ask questions about Shariah-compliant investing.')

  return (
    <FeatureGate
      icon="forum"
      badge="On the roadmap"
      tone="soon"
      title="AI Shariah companion"
      body="A companion that answers Islamic finance and compliance questions, grounded in the AAOIFI standards and the screening methodology Halaq uses, is on our roadmap. It isn't available yet."
      featuresTitle="Planned for Scholar"
      features={[
        'Direct chat about specific rulings',
        'Halal alternative stock suggestions',
        'Automated document drafting',
      ]}
    />
  )
}
