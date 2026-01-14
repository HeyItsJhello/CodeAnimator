import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [totalLines, setTotalLines] = useState(0)
  const [startLine, setStartLine] = useState(1)
  const [endLine, setEndLine] = useState(1)
  const [includeComments, setIncludeComments] = useState(true)
  const [lineGroups, setLineGroups] = useState([])
  const [currentGroup, setCurrentGroup] = useState('')
  const [shownLines, setShownLines] = useState(new Set())

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setFileName(uploadedFile.name)

      // Read file to count lines and store content
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target.result
        setFileContent(content)
        const lines = content.split('\n')
        const lineCount = lines.length
        setTotalLines(lineCount)
        setStartLine(1)
        setEndLine(lineCount)
      }
      reader.readAsText(uploadedFile)
    }
  }

  const addLineGroup = () => {
    if (!currentGroup.trim()) {
      // Add "ALL_REMAINING" marker and mark only remaining lines as shown
      setLineGroups([...lineGroups, 'ALL_REMAINING'])
      const newShownLines = new Set(shownLines)
      // Only add lines that aren't already shown
      for (let i = startLine; i <= endLine; i++) {
        if (!shownLines.has(i)) {
          newShownLines.add(i)
        }
      }
      setShownLines(newShownLines)
      return
    }

    try {
      const lines = currentGroup.trim().split(/\s+/).map(num => parseInt(num))

      // Validate line numbers
      const validLines = lines.filter(lineNum => {
        if (isNaN(lineNum)) return false
        if (shownLines.has(lineNum)) {
          alert(`Warning: Line ${lineNum} already shown`)
          return false
        }
        if (lineNum < startLine || lineNum > endLine) {
          alert(`Warning: Line ${lineNum} is outside range [${startLine}, ${endLine}]`)
          return false
        }
        return true
      })

      if (validLines.length > 0) {
        setLineGroups([...lineGroups, validLines])
        const newShownLines = new Set(shownLines)
        validLines.forEach(line => newShownLines.add(line))
        setShownLines(newShownLines)
        setCurrentGroup('')
      }
    } catch (error) {
      alert('Invalid input. Please enter space-separated numbers')
    }
  }

  const removeLineGroup = (index) => {
    const newGroups = lineGroups.filter((_, i) => i !== index)
    setLineGroups(newGroups)

    // Recalculate shown lines from remaining groups
    const newShownLines = new Set()

    // First, add all explicit line groups
    newGroups.forEach(g => {
      if (Array.isArray(g)) {
        g.forEach(line => newShownLines.add(line))
      }
    })

    // Then, if there's an ALL_REMAINING, add lines not already in groups
    const hasAllRemaining = newGroups.some(g => g === 'ALL_REMAINING')
    if (hasAllRemaining) {
      for (let i = startLine; i <= endLine; i++) {
        newShownLines.add(i)
      }
    }

    setShownLines(newShownLines)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!file) {
      alert('Please upload a file')
      return
    }

    if (lineGroups.length === 0) {
      alert('Please add at least one line group')
      return
    }

    // Create configuration data
    const config = {
      scriptPath: fileName,
      startLine,
      endLine,
      includeComments,
      lineGroups: lineGroups.map(group =>
        group === 'ALL_REMAINING' ? 'ALL_REMAINING' : group.join(' ')
      )
    }

    // Create FormData to send file and config
    const formData = new FormData()
    formData.append('file', file)
    formData.append('config', JSON.stringify(config))

    try {
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]')
      const originalText = submitButton.textContent
      submitButton.textContent = 'Generating Animation...'
      submitButton.disabled = true

      // Send request to backend
      const response = await fetch('http://localhost:8000/api/animate', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to generate animation')
      }

      // Success - download the video
      alert(`Animation generated successfully!\n\nDownloading: ${result.filename}`)

      // Trigger download
      const downloadUrl = `http://localhost:8000/api/download/${result.videoId}`
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Reset button
      submitButton.textContent = originalText
      submitButton.disabled = false

    } catch (error) {
      console.error('Error:', error)
      alert(`Error: ${error.message}`)

      // Reset button
      const submitButton = e.target.querySelector('button[type="submit"]')
      submitButton.textContent = 'Generate Animation'
      submitButton.disabled = false
    }
  }

  const getPreviewLines = () => {
    if (!fileContent) return []
    return fileContent.split('\n')
  }

  const isLineInRange = (lineNum) => {
    return lineNum >= startLine && lineNum <= endLine
  }

  const isLineInGroup = (lineNum) => {
    return shownLines.has(lineNum)
  }

  return (
    <div className="app">
      <div className={`main-layout ${!fileContent ? 'centered' : ''}`}>
        <div className="container">
          <h1>Code Animator</h1>
          <p className="subtitle">Create animated videos of your code with Manim</p>

          <form onSubmit={handleSubmit}>
          {/* File Upload */}
          <div className="form-section">
            <h2>1. Upload Code File</h2>
            <div className="file-upload-wrapper">
              <input
                type="file"
                id="file-upload"
                accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.kt"
                onChange={handleFileUpload}
                required
              />
              <label htmlFor="file-upload" className="file-upload-label">
                {fileName || 'Choose a file...'}
              </label>
            </div>
            {totalLines > 0 && (
              <p className="file-info">✓ File loaded: {totalLines} lines total</p>
            )}
          </div>

          {/* Line Range */}
          {totalLines > 0 && (
            <>
              <div className="form-section">
                <h2>2. Select Line Range</h2>
                <div className="line-range">
                  <div className="input-group">
                    <label htmlFor="start-line">Starting Line:</label>
                    <input
                      type="number"
                      id="start-line"
                      min="1"
                      max={totalLines}
                      value={startLine}
                      onChange={(e) => setStartLine(parseInt(e.target.value))}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="end-line">Ending Line:</label>
                    <input
                      type="number"
                      id="end-line"
                      min={startLine}
                      max={totalLines}
                      value={endLine}
                      onChange={(e) => setEndLine(parseInt(e.target.value))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Include Comments */}
              <div className="form-section">
                <h2>3. Comment Settings</h2>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                  />
                  <span>Include comments in the video</span>
                </label>
              </div>

              {/* Line Groups */}
              <div className="form-section">
                <h2>4. Define Line Groups</h2>
                <p className="help-text">
                  Enter line numbers for each animation group (space-separated).
                  Leave empty and click "Add Group" to show all remaining lines.
                </p>
                <p className="help-text example">Example: 21 38 34</p>

                <div className="line-group-input">
                  <input
                    type="text"
                    placeholder="e.g., 1 2 3 or leave empty for all remaining"
                    value={currentGroup}
                    onChange={(e) => setCurrentGroup(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addLineGroup()
                      }
                    }}
                  />
                  <button type="button" onClick={addLineGroup} className="btn-add">
                    Add Group
                  </button>
                </div>

                {lineGroups.length > 0 && (
                  <div className="line-groups-list">
                    <h3>Animation Groups:</h3>
                    {lineGroups.map((group, index) => (
                      <div key={index} className="line-group-item">
                        <span className="group-number">Group {index + 1}:</span>
                        <span className="group-lines">
                          {group === 'ALL_REMAINING'
                            ? 'All remaining lines'
                            : `Lines ${group.join(', ')}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLineGroup(index)}
                          className="btn-remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="form-section">
                <button type="submit" className="btn-submit">
                  Generate Animation
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Preview Panel */}
      {fileContent && (
        <div className="preview-panel">
          <div className="preview-header">
            <h2>File Preview</h2>
            <span className="preview-filename">{fileName}</span>
          </div>
          <div className="preview-content">
            <pre className="code-preview">
              {getPreviewLines().map((line, index) => {
                const lineNum = index + 1
                const inRange = isLineInRange(lineNum)
                const inGroup = isLineInGroup(lineNum)
                return (
                  <div
                    key={index}
                    className={`code-line ${inRange ? 'in-range' : ''} ${inGroup ? 'in-group' : ''}`}
                  >
                    <span className="line-number">{lineNum}</span>
                    <span className="line-content">{line || ' '}</span>
                  </div>
                )
              })}
            </pre>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

export default App
