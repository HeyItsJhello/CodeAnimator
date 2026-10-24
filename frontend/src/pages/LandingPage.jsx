import {
  Navbar,
  Hero,
  Features,
  HowItWorks,
  Comparison,
  WhyIMadeThis,
  UsedIn,
  CTAFooter
} from '../Components/Landing'
import '../styles/Landing.css'

const GUTTER_LINES = Array.from({ length: 400 }, (_, i) => i + 1).join('\n')

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Line-number gutter: the page reads like a file */}
      <div className="gutter" aria-hidden="true">
        {GUTTER_LINES}
      </div>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Comparison />
      <WhyIMadeThis />
      <UsedIn />
      <CTAFooter />
    </div>
  )
}

export default LandingPage
