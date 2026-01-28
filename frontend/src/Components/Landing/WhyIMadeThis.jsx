import { motion } from "framer-motion";

function WhyIMadeThis() {
  return (
    <section id="why-i-made-this" className="why-i-made-this">
      <div className="why-i-made-this__container">
        <motion.h2
          className="section-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Why was Code Animator Created?
        </motion.h2>
        <motion.div
          className="why-i-made-this__content retro-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p>
            Code Animator was created as a means for{" "}
            <a href="https://github.com/HeyItsJhello">me</a> to move away from
            Static Images of code or just screen recording for my work for
            <a href="https://xogot.com/"> Xogot</a>. As I was developing it, I
            realized it could be used for anyone who teaches or showcases their
            code to others.
          </p>
          <p>
            So it means the world to me that you are currently checking out Code
            Animator and I hope that it's results benefit you in your work. If
            you have any feedback please provide it through the Github.
          </p>
          <b>Thank you so much and Happy Animating!</b>
        </motion.div>
      </div>
    </section>
  );
}

export default WhyIMadeThis;
