import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/HeyItsJhello/CodeAnimator";

function useRepoStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/HeyItsJhello/CodeAnimator")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) {
          setStats({
            stars: data.stargazers_count.toLocaleString(),
            forks: data.forks_count.toLocaleString(),
          });
        }
      })
      .catch((error) => console.error("Failed to fetch GitHub stats:", error));
  }, []);

  return stats;
}

function CTAFooter() {
  const stats = useRepoStats();

  return (
    <>
      <section className="closing">
        <div className="closing__band" aria-hidden="true" />

        <h2 className="closing__title">Free and open source.</h2>
        <p className="closing__text">
          MIT licensed. No accounts, no subscriptions, no watermark. Your code
          is deleted as soon as it's read, and the video once you download it
          (or after 30 minutes if you don't).
        </p>

        {stats && (
          <ul className="closing__stats">
            <li><strong>{stats.stars}</strong> stars</li>
            <li><strong>{stats.forks}</strong> forks</li>
          </ul>
        )}

        <div className="closing__actions">
          <Link to="/" className="pixel-btn pixel-btn--primary pixel-btn--large">
            Try it online
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="closing__link"
          >
            Read the source on GitHub
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="footer__container">
          <Link to="/landing" className="footer__logo">
            <span className="logo-mark" aria-hidden="true" />
            Code Animator
          </Link>

          <nav className="footer__links" aria-label="Footer">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="footer__link">
              GitHub
            </a>
            <a href={`${REPO_URL}#readme`} target="_blank" rel="noopener noreferrer" className="footer__link">
              Docs
            </a>
            <a href="https://ko-fi.com/jhello" target="_blank" rel="noopener noreferrer" className="footer__link">
              Support me on Ko-fi
            </a>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" className="footer__link">
              Send feedback
            </a>
          </nav>

          <p className="footer__fineprint">
            © {new Date().getFullYear()} Code Animator, MIT License. Rendered with Remotion.
          </p>
        </div>
      </footer>
    </>
  );
}

export default CTAFooter;
