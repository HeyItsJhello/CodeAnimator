import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function OpenSource() {
  const [stats, setStats] = useState({
    stars: "—",
    forks: "—",
    contributors: "—",
  });

  useEffect(() => {
    const fetchGitHubStats = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/HeyItsJhello/CodeAnimator",
        );
        if (response.ok) {
          const data = await response.json();
          setStats({
            stars: data.stargazers_count?.toLocaleString() || "—",
            forks: data.forks_count?.toLocaleString() || "—",
            contributors: "—", // Would need separate API call
          });
        }
      } catch (error) {
        console.error("Failed to fetch GitHub stats:", error);
      }
    };
    fetchGitHubStats();
  }, []);

  return (
    <section id="open-source" className="open-source">
      <div className="open-source__container">
        <motion.div
          className="open-source__content"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="open-source__icon">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </span>

          <h2 className="section-title">Free & Open Source</h2>

          <p className="open-source__description">
            Code Animator is MIT licensed and free forever.
            <br />
            No accounts, no subscriptions, no limits.
            <br />
            Your code stays private, files are deleted immediately after
            processing.
          </p>

          <div className="open-source__stats">
            <div className="open-source__stat retro-card">
              <span className="open-source__stat-value">
                <img
                  src="/Star.png"
                  alt=""
                  className="open-source__stat-icon"
                />
                {stats.stars}
              </span>
              <span className="open-source__stat-label">Stars</span>
            </div>
            <div className="open-source__stat retro-card">
              <span className="open-source__stat-value">
                <img
                  src="/Fork.png"
                  alt=""
                  className="open-source__stat-icon"
                />
                {stats.forks}
              </span>
              <span className="open-source__stat-label">Forks</span>
            </div>
            <div className="open-source__stat retro-card">
              <span className="open-source__stat-value">
                <img
                  src="/File.png"
                  alt=""
                  className="open-source__stat-icon"
                />
                MIT
              </span>
              <span className="open-source__stat-label">License</span>
            </div>
          </div>

          <a
            href="https://github.com/HeyItsJhello/CodeAnimator"
            target="_blank"
            rel="noopener noreferrer"
            className="retro-btn retro-btn--secondary"
          >
            View on GitHub →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default OpenSource;
