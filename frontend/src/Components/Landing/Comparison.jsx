import { motion } from 'framer-motion'

const competitors = ["Code Animator", "Screen Recording", "Static Images", "Video Editors"]

const criteria = [
  {
    label: "Setup Time",
    values: [
      { text: "None", status: "good" },
      { text: "Some", status: "okay" },
      { text: "None", status: "good" },
      { text: "Lots", status: "bad" }
    ]
  },
  {
    label: "Animated Output",
    values: [
      { text: "Yes", status: "good" },
      { text: "Yes", status: "good" },
      { text: "No", status: "bad" },
      { text: "Yes", status: "good" }
    ]
  },
  {
    label: "Consistent Quality",
    values: [
      { text: "Always", status: "good" },
      { text: "Varies", status: "bad" },
      { text: "Always", status: "good" },
      { text: "Manual", status: "okay" }
    ]
  },
  {
    label: "Line-by-Line Control",
    values: [
      { text: "Yes", status: "good" },
      { text: "No", status: "bad" },
      { text: "No", status: "bad" },
      { text: "Manual", status: "okay" }
    ]
  },
  {
    label: "Time Required",
    values: [
      { text: "Seconds", status: "good" },
      { text: "Minutes", status: "okay" },
      { text: "Seconds", status: "good" },
      { text: "Hours", status: "bad" }
    ]
  },
  {
    label: "Learning Curve",
    values: [
      { text: "None", status: "good" },
      { text: "None", status: "good" },
      { text: "None", status: "good" },
      { text: "Steep", status: "bad" }
    ]
  },
  {
    label: "Cost",
    values: [
      { text: "Free", status: "good" },
      { text: "Varies", status: "okay" },
      { text: "Free", status: "good" },
      { text: "$$$", status: "bad" }
    ]
  }
]

function Comparison() {
  return (
    <section id="comparison" className="comparison">
      <div className="comparison__container">
        <motion.div 
          className="comparison__header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="section-title">Why Code Animator?</h2>
          <p className="section-subtitle">See how we compare to the alternatives</p>
        </motion.div>
        
        <motion.div 
          className="comparison__table-wrapper retro-card"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <table className="comparison__table">
            <thead>
              <tr>
                <th className="comparison__header-cell comparison__header-cell--label">Compare</th>
                {competitors.map((comp, index) => (
                  <th 
                    key={index} 
                    className={`comparison__header-cell ${index === 0 ? 'comparison__header-cell--highlight' : ''}`}
                  >
                    {comp}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="comparison__label-cell">{row.label}</td>
                  {row.values.map((value, colIndex) => (
                    <td 
                      key={colIndex} 
                      className={`comparison__value-cell comparison__value-cell--${value.status} ${colIndex === 0 ? 'comparison__value-cell--highlight' : ''}`}
                    >
                      <img 
                        src={value.status === 'good' ? '/Check.png' : value.status === 'bad' ? '/X.png' : '/Wrench.png'} 
                        alt={value.status}
                        className="comparison__status-icon"
                      />
                      {value.text}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}

export default Comparison
