import { useState } from "react";

export default function Item({ person, title, description, images, audio }) {
  const [open, setOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  return (
    <article className={`item ${open ? "open" : ""}`}>
      <div className="image-wrap">
        {images.length > 1 ? (
          <div className="image-scroll">
            {images.map((src, i) => (
              <img key={i} src={src} />
            ))}
          </div>
        ) : (
          <img src={images[0]} />
        )}
      </div>

      <div className="info-row">
        <div className="person">{person}</div>
        <div className="title-text">{title}</div>
        <button onClick={() => setOpen(!open)}>
          {open ? "Hide" : "Read"}
        </button>
      </div>

      {open && (
        <div className="details">
          {description && <p className="description">{description}</p>}

          {audio && (
            <div className="audio">
              <div
                className="waves"
                onClick={() => setShowTranscript(!showTranscript)}
              />
              {showTranscript && (
                <p className="transcript">
                  Transcribed audio appears here.
                </p>
              )}
            </div>
          )}

          <div className="uploaded">Uploaded by {person}</div>
        </div>
      )}
    </article>
  );
}
