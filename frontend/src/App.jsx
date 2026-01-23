import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

// Data imports
import {
  API_URL,
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
} from "./data/constants";
import { getTokenPatterns, tokenizeLine } from "./data/tokenizer";

// Utility functions
import {
  parseLineToken,
  checkApiStatus as checkApiStatusFn,
  buildTimingConfig,
  buildLineGroupsForApi,
  calculateLineGroupMap,
} from "./utils/functions";

// Components
import {
  ApiStatusBanner,
  FileUploadSection,
  LineRangeSection,
  CommentSettings,
  ColorSettings,
  OrientationToggle,
  QualityPreset,
  TimingSettings,
  LineGroupsSection,
  PreviewPanel,
  LoadingModal,
  SplitModal,
  ColorModal,
  PreviewModal,
  VideoCompleteModal,
  SubmitSection,
} from "./Components";

function App() {
  // File state
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [totalLines, setTotalLines] = useState(0);

  // Line range state
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(1);

  // Settings state
  const [includeComments, setIncludeComments] = useState(true);
  const [syntaxColors, setSyntaxColors] = useState({ ...DEFAULT_SYNTAX_COLORS });
  const [orientation, setOrientation] = useState("landscape");
  const [quality, setQuality] = useState("standard");
  const [animationTiming, setAnimationTiming] = useState({ ...DEFAULT_TIMING_STR });

  // Line groups state
  const [lineGroups, setLineGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");
  const [shownLines, setShownLines] = useState(new Set());

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("starting");

  // Modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitLineInput, setSplitLineInput] = useState("");
  const [showColorModal, setShowColorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadAnotherModal, setShowUploadAnotherModal] = useState(false);

  // Video state
  const [completedVideoUrl, setCompletedVideoUrl] = useState(null);
  const [completedVideoFilename, setCompletedVideoFilename] = useState("");

  // API state
  const [apiStatus, setApiStatus] = useState("awake");

  // Check API status on mount
  const checkApiStatus = useCallback(() => {
    checkApiStatusFn(setApiStatus);
  }, []);

  useEffect(() => {
    checkApiStatus();
  }, [checkApiStatus]);

  // File upload handler
  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setFileName(uploadedFile.name);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setFileContent(content);
        const lineCount = content.split("\n").length;
        setTotalLines(lineCount);
        setStartLine(1);
        setEndLine(lineCount);
      };
      reader.readAsText(uploadedFile);
    }
  };

  // Line group handlers
  const addLineGroup = () => {
    if (!currentGroup.trim()) {
      setLineGroups([...lineGroups, "ALL_REMAINING"]);
      const newShownLines = new Set(shownLines);
      for (let i = startLine; i <= endLine; i++) {
        if (!shownLines.has(i)) {
          newShownLines.add(i);
        }
      }
      setShownLines(newShownLines);
      return;
    }

    try {
      const lines = currentGroup.trim().split(/\s+/).flatMap(parseLineToken);

      const validLines = lines.filter((lineNum) => {
        if (isNaN(lineNum)) return false;
        if (shownLines.has(lineNum)) {
          alert(`Warning: Line ${lineNum} already shown`);
          return false;
        }
        if (lineNum < startLine || lineNum > endLine) {
          alert(`Warning: Line ${lineNum} is outside range [${startLine}, ${endLine}]`);
          return false;
        }
        return true;
      });

      if (validLines.length > 0) {
        setLineGroups([...lineGroups, validLines]);
        const newShownLines = new Set(shownLines);
        validLines.forEach((line) => newShownLines.add(line));
        setShownLines(newShownLines);
        setCurrentGroup("");
      }
    } catch {
      alert("Invalid input. Please enter space-separated numbers");
    }
  };

  const removeLineGroup = (index) => {
    const newGroups = lineGroups.filter((_, i) => i !== index);
    setLineGroups(newGroups);

    const newShownLines = new Set();
    newGroups.forEach((g) => {
      if (Array.isArray(g)) {
        g.forEach((line) => newShownLines.add(line));
      } else if (typeof g === "object" && g.type === "SPLIT") {
        newShownLines.add(g.line);
      }
    });

    const hasAllRemaining = newGroups.some((g) => g === "ALL_REMAINING");
    if (hasAllRemaining) {
      for (let i = startLine; i <= endLine; i++) {
        newShownLines.add(i);
      }
    }

    setShownLines(newShownLines);
  };

  const clearAllGroups = () => {
    setLineGroups([]);
    setShownLines(new Set());
    setCurrentGroup("");
  };

  // Split handler
  const addSplit = () => {
    const lineNum = parseInt(splitLineInput);

    if (isNaN(lineNum)) {
      alert("Please enter a valid line number");
      return;
    }

    if (lineNum < startLine || lineNum > endLine) {
      alert(`Line ${lineNum} is outside range [${startLine}, ${endLine}]`);
      return;
    }

    if (shownLines.has(lineNum)) {
      alert(`Line ${lineNum} has already been shown`);
      return;
    }

    setLineGroups([...lineGroups, { type: "SPLIT", line: lineNum }]);
    const newShownLines = new Set(shownLines);
    newShownLines.add(lineNum);
    setShownLines(newShownLines);
    setSplitLineInput("");
    setShowSplitModal(false);
  };

  // Timing handlers
  const updateTiming = (key, value) => {
    setAnimationTiming((prev) => ({
      ...prev,
      [key]: value === "" ? "" : value,
    }));
  };

  const resetTiming = () => setAnimationTiming({ ...DEFAULT_TIMING_STR });

  // Reset handlers
  const resetForNewFile = () => {
    setFile(null);
    setFileName("");
    setFileContent("");
    setTotalLines(0);
    setStartLine(1);
    setEndLine(1);
    setLineGroups([]);
    setCurrentGroup("");
    setShownLines(new Set());
    setShowUploadAnotherModal(false);
    setCompletedVideoUrl(null);
    setCompletedVideoFilename("");
    setQuality("standard");
    window._videoDownloadUrl = null;
  };

  // Video handlers
  const handleDownloadVideo = () => {
    const downloadUrl = window._videoDownloadUrl;
    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = completedVideoFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCloseVideoModal = () => {
    setShowUploadAnotherModal(false);
    setCompletedVideoUrl(null);
    setCompletedVideoFilename("");
    window._videoDownloadUrl = null;
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please upload a file");
      return;
    }

    if (lineGroups.length === 0) {
      alert("Please add at least one line group");
      return;
    }

    const timingConfig = buildTimingConfig(animationTiming);

    const config = {
      scriptPath: fileName,
      startLine,
      endLine,
      includeComments,
      orientation,
      quality,
      lineGroups: buildLineGroupsForApi(lineGroups),
      syntaxColors,
      animationTiming: timingConfig,
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("config", JSON.stringify(config));

    try {
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingStatus("starting");

      const response = await fetch(`${API_URL}/api/animate`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to generate animation");
      }

      const taskId = result.taskId;
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${API_URL}/api/progress/${taskId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setLoadingProgress(progressData.progress);
            setLoadingStatus(progressData.status || "processing");

            if (progressData.status === "complete" || progressData.progress >= 100) {
              clearInterval(progressInterval);
            }
          }
        } catch (err) {
          console.error("Progress polling error:", err);
        }
      }, 500);

      await new Promise((resolve) => {
        const checkComplete = setInterval(async () => {
          try {
            const progressResponse = await fetch(`${API_URL}/api/progress/${taskId}`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.status === "complete" || progressData.progress >= 100) {
                clearInterval(checkComplete);
                clearInterval(progressInterval);
                setLoadingProgress(100);
                resolve();
              }
            }
          } catch (err) {
            console.error("Completion check error:", err);
          }
        }, 500);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      const streamUrl = `${API_URL}/api/stream/${result.videoId}`;
      const downloadUrl = `${API_URL}/api/download/${result.videoId}`;
      setCompletedVideoUrl(streamUrl);
      setCompletedVideoFilename(result.filename);
      window._videoDownloadUrl = downloadUrl;

      setIsLoading(false);
      setLoadingProgress(0);
      setShowUploadAnotherModal(true);
    } catch (error) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
      setIsLoading(false);
      setLoadingProgress(0);
    }
  };

  // Memoized values
  const fileExtension = fileName ? "." + fileName.split(".").pop() : "";

  const highlightedLines = useMemo(() => {
    if (!fileContent) return [];
    const lines = fileContent.split("\n");
    const patterns = getTokenPatterns(fileExtension);
    return lines.map((line, idx) => ({
      lineNum: idx + 1,
      tokens: tokenizeLine(line, patterns, syntaxColors),
    }));
  }, [fileContent, fileExtension, syntaxColors]);

  const lineGroupMap = useMemo(() => {
    return calculateLineGroupMap(lineGroups, startLine, endLine);
  }, [lineGroups, startLine, endLine]);

  return (
    <div className="app">
      <div className={`main-layout ${!fileContent ? "centered" : ""}`}>
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

          <ApiStatusBanner apiStatus={apiStatus} onRetry={checkApiStatus} />

          <form onSubmit={handleSubmit}>
            <FileUploadSection
              fileName={fileName}
              totalLines={totalLines}
              onFileUpload={handleFileUpload}
            />

            <AnimatePresence>
              {totalLines > 0 && (
                <>
                  <LineRangeSection
                    startLine={startLine}
                    endLine={endLine}
                    totalLines={totalLines}
                    onStartLineChange={setStartLine}
                    onEndLineChange={setEndLine}
                  />

                  <CommentSettings
                    includeComments={includeComments}
                    onIncludeCommentsChange={setIncludeComments}
                  />

                  <ColorSettings
                    syntaxColors={syntaxColors}
                    onOpenColorModal={() => setShowColorModal(true)}
                  />

                  <OrientationToggle
                    orientation={orientation}
                    onOrientationChange={setOrientation}
                  />

                  <QualityPreset
                    quality={quality}
                    onQualityChange={setQuality}
                  />

                  <TimingSettings
                    animationTiming={animationTiming}
                    onUpdateTiming={updateTiming}
                    onResetTiming={resetTiming}
                  />

                  <LineGroupsSection
                    lineGroups={lineGroups}
                    currentGroup={currentGroup}
                    onCurrentGroupChange={setCurrentGroup}
                    onAddLineGroup={addLineGroup}
                    onRemoveLineGroup={removeLineGroup}
                    onClearAllGroups={clearAllGroups}
                    onOpenSplitModal={() => setShowSplitModal(true)}
                  />

                  <SubmitSection apiStatus={apiStatus} />
                </>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        <AnimatePresence>
          {fileContent && (
            <PreviewPanel
              fileName={fileName}
              fileContent={fileContent}
              startLine={startLine}
              endLine={endLine}
              shownLines={shownLines}
              lineGroupMap={lineGroupMap}
              onOpenPreviewModal={() => setShowPreviewModal(true)}
            />
          )}
        </AnimatePresence>

        <LoadingModal
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          loadingStatus={loadingStatus}
        />

        <SplitModal
          show={showSplitModal}
          splitLineInput={splitLineInput}
          startLine={startLine}
          endLine={endLine}
          onSplitLineInputChange={setSplitLineInput}
          onAddSplit={addSplit}
          onClose={() => setShowSplitModal(false)}
        />

        <ColorModal
          show={showColorModal}
          syntaxColors={syntaxColors}
          onSyntaxColorsChange={setSyntaxColors}
          onClose={() => setShowColorModal(false)}
        />

        <PreviewModal
          show={showPreviewModal}
          highlightedLines={highlightedLines}
          syntaxColors={syntaxColors}
          startLine={startLine}
          endLine={endLine}
          onClose={() => setShowPreviewModal(false)}
          onOpenColorModal={() => setShowColorModal(true)}
        />

        <VideoCompleteModal
          show={showUploadAnotherModal}
          completedVideoUrl={completedVideoUrl}
          onClose={handleCloseVideoModal}
          onDownload={handleDownloadVideo}
          onUploadNew={resetForNewFile}
        />
      </div>
    </div>
  );
}

export default App;
