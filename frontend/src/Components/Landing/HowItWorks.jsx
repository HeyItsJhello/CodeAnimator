import { motion } from 'framer-motion'

const steps = [
  {
    number: "01",
    title: "Upload Your Code",
    description: "Drag and drop any code file. We support Python, JavaScript, TypeScript, Go, Rust, Java, C++, and more.",
    icon: "/File.png"
  },
  {
    number: "02",
    title: "Configure Animation",
    description: "Choose line ranges, group lines together, customize syntax colors, and preview everything in real-time.",
    icon: "/Gear.png"
  },
  {
    number: "03",
    title: "Download Your Video",
    description: "Click generate and get a professional 1080p60 MP4 video in seconds. Ready to share anywhere.",
    icon: "/Movie.png"
  }
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works">
      <div className="how-it-works__container">
        <motion.div 
          className="how-it-works__header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three steps to amazing code videos</p>
        </motion.div>
        
        <div className="how-it-works__steps">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              className="step"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <div className="step__number-container">
                <span className="step__number">{step.number}</span>
                {index < steps.length - 1 && <div className="step__connector"></div>}
              </div>
              <div className="step__content retro-card">
                <img src={step.icon} alt={step.title} className="step__icon" />
                <h3 className="step__title">{step.title}</h3>
                <p className="step__description">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
