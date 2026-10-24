import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { USED_IN_VIDEOS } from '../../config/constants'

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
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">
        <Link to="/landing" className="navbar__logo">
          <span className="logo-mark" aria-hidden="true" />
          Code Animator
        </Link>

        <div className="navbar__links">
          {showSectionLinks && (
            <>
              <button onClick={() => scrollToSection('how-it-works')} className="navbar__link">
                How it works
              </button>
              <button onClick={() => scrollToSection('why-i-made-this')} className="navbar__link">
                Why I made this
              </button>
              {USED_IN_VIDEOS.length > 0 && (
                <button onClick={() => scrollToSection('used-in')} className="navbar__link">
                  Seen in
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
          <Link to="/" className="navbar__cta">
            Try it online
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
