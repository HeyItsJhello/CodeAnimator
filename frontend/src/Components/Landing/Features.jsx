import { motion } from 'framer-motion'

const features = [
  {
    icon: "/Internet.png",
    title: "Web & CLI",
    description: "Use the sleek web interface or powerful command-line tool. Your choice, your workflow."
  },
  {
    icon: "/Paint.png",
    title: "Syntax Highlighting",
    description: "Beautiful, customizable syntax colors for 12+ programming languages including Python, JS, Go, Rust."
  },
  {
    icon: "/Chain.png",
    title: "Line Grouping",
    description: "Control exactly how your code appears. Group lines, add splits, set custom timing for each reveal."
  },
  {
    icon: "/Movie.png",
    title: "1080p60 Output",
    description: "Professional quality videos rendered with Manim. Crisp text, smooth animations, no artifacts."
  },
  {
    icon: "/Shield.png",
    title: "Privacy First",
    description: "Your code is deleted immediately after processing. Nothing is stored. Ever."
  },
  {
    icon: "/Hammer.png",
    title: "Instant Results",
    description: "Upload, configure, download. Get your animated video in under a minute. No account required."
  }
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

function Features() {
  return (
    <section id="features" className="features">
      <div className="features__container">
        <motion.div 
          className="features__header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Everything You Need to Showcase Your Code</h2>
          <p className="section-subtitle">Powerful features, zero complexity</p>
        </motion.div>
        
        <motion.div 
          className="features__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              className="feature-card retro-card"
              variants={itemVariants}
            >
              <img src={feature.icon} alt={feature.title} className="feature-card__icon" />
              <h3 className="feature-card__title">{feature.title}</h3>
              <p className="feature-card__description">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default Features
