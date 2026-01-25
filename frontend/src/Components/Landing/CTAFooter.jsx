import { Link } from "react-router-dom";
import { motion } from "framer-motion";

function CTAFooter() {
  return (
    <>
      <section className="cta-section">
        <div className="cta-section__container">
          <motion.div
            className="cta-section__content"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="cta-section__title">Ready to Animate Your Code?</h2>
            <p className="cta-section__subtitle">
              Join developers creating stunning code showcases
            </p>
            <Link
              to="/app"
              className="retro-btn retro-btn--primary retro-btn--large"
            >
              Start Creating — It's Free
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__container">
          <div className="footer__top">
            <Link to="/" className="footer__logo">
              <img src="/Movie.png" alt="" className="footer__logo-icon" />
              Code Animator
            </Link>

            <div className="footer__links">
              <a
                href="https://github.com/HeyItsJhello/CodeAnimator"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__link"
              >
                GitHub
              </a>
              <a
                href="https://github.com/HeyItsJhello/CodeAnimator#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__link"
              >
                Documentation
              </a>
              <a
                href="https://ko-fi.com/jhello"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__link"
              >
                Support
              </a>
              <a
                href="https://github.com/HeyItsJhello/CodeAnimator/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__link"
              >
                Feedback
              </a>
            </div>
          </div>

          <div className="footer__bottom">
            <p className="footer__copyright">
              © {new Date().getFullYear()} Code Animator. MIT License.
            </p>
            <p className="footer__made-with">
              Made with Manim by a creator, for Creators
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default CTAFooter;
