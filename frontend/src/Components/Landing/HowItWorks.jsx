const steps = [
  {
    title: "Upload a file",
    description: "Drop in any code file. Python, JavaScript, Go, Rust, GDScript and more.",
  },
  {
    title: "Pick lines and timing",
    description: "Choose the range, group lines that should appear together, and tweak the colors. The preview updates as you go.",
  },
  {
    title: "Download the video",
    description: "Hit Generate and get an MP4, up to 4K60, ready to drop into your edit.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="how-it-works">
      <h2 className="section-title">How it works</h2>

      <ol className="stairs">
        {steps.map((step, index) => (
          <li key={step.title} className="stairs__step">
            <span className="stairs__number" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <h3 className="stairs__title">{step.title}</h3>
              <p className="stairs__description">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
