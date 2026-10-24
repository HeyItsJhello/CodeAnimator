import { USED_IN_VIDEOS } from "../../config/constants";

function UsedIn() {
  const videos = USED_IN_VIDEOS;

  if (videos.length === 0) {
    return null;
  }

  const shouldScroll = videos.length >= 4;

  // Duplicate videos for seamless infinite scroll
  const displayVideos = shouldScroll ? [...videos, ...videos] : videos;

  return (
    <section id="used-in" className="used-in">
      <h2 className="section-title">Seen in</h2>

      <div className="used-in__slider">
        <div className={`used-in__videos${shouldScroll ? " used-in__videos--scrollable" : ""}`}>
          {displayVideos.map((video, index) => (
            <figure key={index} className="used-in__video">
              <div className="used-in__video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <figcaption className="used-in__video-title">{video.title}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export default UsedIn;
