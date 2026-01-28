import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usedInVideos } from './UsedIn'

function Navbar({ showSectionLinks = true }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="navbar__container">
        <Link to="/" className="navbar__logo">
          <img src="/Movie.png" alt="" className="navbar__logo-icon" />
          Code Animator
        </Link>

        <div className="navbar__links">
          {showSectionLinks && (
            <>
              <button onClick={() => scrollToSection('features')} className="navbar__link">
                Features
              </button>
              <button onClick={() => scrollToSection('how-it-works')} className="navbar__link">
                How It Works
              </button>
              <button onClick={() => scrollToSection('why-i-made-this')} className="navbar__link">
                Why I Made This
              </button>
              {usedInVideos.length > 0 && (
                <button onClick={() => scrollToSection('used-in')} className="navbar__link">
                  Used In
                </button>
              )}
            </>
          )}
          <Link to="/downloads" className="navbar__link">
            Downloads
          </Link>
          <a
            href="https://github.com/HeyItsJhello/CodeAnimator"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar__link"
          >
            GitHub
          </a>
          <Link to="/app" className="navbar__cta">
            Try It Free →
          </Link>
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar
