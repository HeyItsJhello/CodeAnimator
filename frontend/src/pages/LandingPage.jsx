import { 
  Navbar, 
  Hero, 
  Features, 
  HowItWorks, 
  Comparison, 
  OpenSource, 
  CTAFooter 
} from '../Components/Landing'
import '../styles/Landing.css'

function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Comparison />
      <OpenSource />
      <CTAFooter />
    </div>
  )
}

export default LandingPage
