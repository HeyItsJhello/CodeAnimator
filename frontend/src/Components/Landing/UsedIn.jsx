import { motion } from "framer-motion";

export const usedInVideos = [
  { id: "7xtbcF-l3mw?si=gq6UrK4hU_n5lGxf", title: "Xogot Polygon Tutorial" },
];

function UsedIn() {
  const videos = usedInVideos;

  const shouldScroll = videos.length >= 4;

  if (videos.length === 0) {
    return null;
  }

  const displayVideos = shouldScroll ? [...videos, ...videos] : videos;

  return (
    <section id="used-in" className="used-in">
      <div className="used-in__container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Used In
        </motion.h2>
        <motion.p
          className="section-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Look at what has been created with Code Animator!
        </motion.p>
        <div className="used-in__slider">
          <motion.div
            className={`used-in__videos ${shouldScroll ? "used-in__videos--scrollable" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {displayVideos.map((video, index) => (
              <div key={index} className="used-in__video">
                <div className="used-in__video-container">
                  <div className="used-in__video-header">
                    <span className="used-in__video-dot used-in__video-dot--red"></span>
                    <span className="used-in__video-dot used-in__video-dot--yellow"></span>
                    <span className="used-in__video-dot used-in__video-dot--green"></span>
                    <span className="used-in__video-title">{video.title}</span>
                  </div>
                  <div className="used-in__video-content">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.id}`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default UsedIn;
