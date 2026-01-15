import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0]
    if (uploadedFile) {
      setFile(uploadedFile)
      setFileName(uploadedFile.name)

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
      // Show loading modal
      setIsLoading(true)
      setLoadingProgress(0)

      // Send request to backend
      const response = await fetch('http://localhost:8000/api/animate', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to generate animation')
      }

      // Start polling for progress
      const taskId = result.taskId
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`http://localhost:8000/api/progress/${taskId}`)
          if (progressResponse.ok) {
            const progressData = await progressResponse.json()
            setLoadingProgress(progressData.progress)

            // Stop polling when complete
            if (progressData.status === 'complete' || progressData.progress >= 100) {
              clearInterval(progressInterval)
            }
          }
        } catch (err) {
          console.error('Progress polling error:', err)
        }
      }, 500)

      // Wait for completion
      await new Promise(resolve => {
        const checkComplete = setInterval(async () => {
          try {
            const progressResponse = await fetch(`http://localhost:8000/api/progress/${taskId}`)
            if (progressResponse.ok) {
              const progressData = await progressResponse.json()
              if (progressData.status === 'complete' || progressData.progress >= 100) {
                clearInterval(checkComplete)
                clearInterval(progressInterval)
                setLoadingProgress(100)
                resolve()
              }
            }
          } catch (err) {
            console.error('Completion check error:', err)
          }
        }, 500)
      })

      // Wait a moment to show 100%
      await new Promise(resolve => setTimeout(resolve, 500))

      // Trigger download
      const downloadUrl = `http://localhost:8000/api/download/${result.videoId}`
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = result.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Hide loading modal
      setIsLoading(false)
      setLoadingProgress(0)

    } catch (error) {
      console.error('Error:', error)
      alert(`Error: ${error.message}`)
      setIsLoading(false)
      setLoadingProgress(0)
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
        <motion.div
          className="container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Code Animator
          </motion.h1>
          <motion.p
            className="subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Create an automatic showcase of your code! (Animated using Manim)
          </motion.p>

          <form onSubmit={handleSubmit}>
          {/* File Upload */}
          <motion.div
            className="form-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2>1. Upload Code File</h2>
            <div className="file-upload-wrapper">
              <input
                type="file"
                id="file-upload"
                accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.kt,.gd"
                onChange={handleFileUpload}
                required
              />
              <label htmlFor="file-upload" className="file-upload-label">
                {fileName || 'Choose a file...'}
              </label>
            </div>
            <AnimatePresence>
            {totalLines > 0 && (
              <motion.p
                className="file-info"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                ✓ File loaded: {totalLines} lines total
              </motion.p>
            )}
            </AnimatePresence>
          </motion.div>

          {/* Line Range */}
          <AnimatePresence>
          {totalLines > 0 && (
            <>
              <motion.div
                className="form-section"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
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
              </motion.div>

              {/* Include Comments */}
              <motion.div
                className="form-section"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h2>3. Comment Settings</h2>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                  />
                  <span>Include comments in the video</span>
                </label>
              </motion.div>

              {/* Line Groups */}
              <motion.div
                className="form-section"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
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

                <AnimatePresence>
                {lineGroups.length > 0 && (
                  <motion.div
                    className="line-groups-list"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3>Animation Groups:</h3>
                    <AnimatePresence mode="popLayout">
                    {lineGroups.map((group, index) => (
                      <motion.div
                        key={index}
                        className="line-group-item"
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.8 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                        layout
                      >
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
                      </motion.div>
                    ))}
                    </AnimatePresence>
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>

              {/* Submit */}
              <motion.div
                className="form-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <button type="submit" className="btn-submit">
                  Generate Animation
                </button>
              </motion.div>
            </>
          )}
          </AnimatePresence>
        </form>
      </motion.div>

      {/* Preview Panel */}
      <AnimatePresence>
      {fileContent && (
        <motion.div
          className="preview-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* Loading Modal */}
      <AnimatePresence>
      {isLoading && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="loading-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="loading-header">
              <span className="loading-title">Code Animator</span>
            </div>
            <div className="loading-body">
              <div className="loading-icon">🎬</div>
              <h3 className="loading-text">Generating Animation...</h3>
              <p className="loading-subtext">Please wait while we render your code animation</p>
              <div className="progress-bar-container">
                <div className="progress-bar-bg">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <motion.span
                  className="progress-text"
                  key={Math.round(loadingProgress)}
                  initial={{ scale: 1.2, color: "#e63946" }}
                  animate={{ scale: 1, color: "#e63946" }}
                  transition={{ duration: 0.2 }}
                >
                  {Math.round(loadingProgress)}%
                </motion.span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
    </div>
  )
}

export default App
