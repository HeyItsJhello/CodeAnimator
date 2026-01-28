import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../Components/Landing/Navbar";
import "../styles/Landing.css";

function DownloadsPage() {
  const downloads = [
    {
      platform: "macOS",
      arch: "Apple Silicon (M-Series Chip)",
      filename: "CodeAnimator_0.1.0_aarch64.dmg",
      path: "/Downloads/CodeAnimator_0.1.0_aarch64.dmg",
      size: "174 MB",
      icon: "/Apple.png",
    },
  ];

  return (
    <div className="landing-page">
      <Navbar showSectionLinks={false} />
      <section className="downloads">
        <div className="downloads__container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="back-to-home">
              ← Back to Home
            </Link>
            <h1 className="section-title">Downloads</h1>
            <p className="section-subtitle">
              Get Code Animator for your platform
            </p>
          </motion.div>

          <div className="downloads__grid">
            {downloads.map((download, index) => (
              <motion.a
                key={download.filename}
                href={download.path}
                download
                className="retro-card download-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              >
                <div className="download-card__icon">
                  <img src={download.icon} alt={download.platform} />
                </div>
                <div className="download-card__info">
                  <h3 className="download-card__platform">
                    {download.platform}
                  </h3>
                  <p className="download-card__arch">{download.arch}</p>
                  <p className="download-card__meta">
                    {download.filename} • {download.size}
                  </p>
                </div>
                <div className="download-card__action">
                  <span className="retro-btn retro-btn--primary">
                    Download →
                  </span>
                </div>
              </motion.a>
            ))}
          </div>

          <motion.div
            className="downloads__more"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p className="downloads__more-text">
              More platforms coming soon! Windows and Linux builds are in
              development.
            </p>
            <a
              href="https://github.com/HeyItsJhello/CodeAnimator/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-btn retro-btn--secondary"
            >
              View All Releases on GitHub
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default DownloadsPage;
