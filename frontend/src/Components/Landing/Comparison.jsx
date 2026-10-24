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
      <h2 className="section-title">Compared to the usual options</h2>

      <div className="comparison__table-wrapper">
        <table className="comparison__table">
          <thead>
            <tr>
              <td />
              {competitors.map((comp, index) => (
                <th
                  key={comp}
                  scope="col"
                  className={index === 0 ? "comparison__ours" : undefined}
                >
                  {comp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, colIndex) => (
                  <td
                    key={colIndex}
                    className={`comparison__value--${value.status}${colIndex === 0 ? " comparison__ours" : ""}`}
                  >
                    {value.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Comparison
