import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function Hero() {
  return (
    <section className="hero">
      <div className="hero__container">
        <motion.span 
          className="hero__eyebrow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Open Source • Free Forever
        </motion.span>
        
        <motion.h1 
          className="hero__headline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Turn Your Code Into<br />
          <span className="hero__headline--accent">Stunning Animated Videos</span>
        </motion.h1>
        
        <motion.p 
          className="hero__subheadline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Create professional code animations with Manim in seconds.<br />
          No video editing skills required. Just upload, configure, and download.
        </motion.p>
        
        <motion.div 
          className="hero__buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/app" className="retro-btn retro-btn--primary">
            Try It Free →
          </Link>
          <a 
            href="https://github.com/HeyItsJhello/CodeAnimator" 
            target="_blank" 
            rel="noopener noreferrer"
            className="retro-btn retro-btn--secondary"
          >
            View on GitHub
          </a>
        </motion.div>
        
        <motion.div 
          className="hero__demo"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="hero__demo-container">
            <div className="hero__demo-header">
              <span className="hero__demo-dot hero__demo-dot--red"></span>
              <span className="hero__demo-dot hero__demo-dot--yellow"></span>
              <span className="hero__demo-dot hero__demo-dot--green"></span>
              <span className="hero__demo-title">code_animation.mp4</span>
            </div>
            <div className="hero__demo-content">
              {/* Video placeholder - replace src with your demo video */}
              <video 
                className="hero__demo-video"
                autoPlay 
                loop 
                muted 
                playsInline
                poster=""
              >
                {/* Add your video source here */}
                {/* <source src="/demo.mp4" type="video/mp4" /> */}
              </video>
              <div className="hero__demo-placeholder">
              <div className="hero__demo-placeholder-icon">
                <img src="/Movie.png" alt="" className="hero__demo-placeholder-img" />
              </div>
                <span className="hero__demo-placeholder-text">Demo Video</span>
                <span className="hero__demo-placeholder-subtext">Add your video at /public/demo.mp4</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
