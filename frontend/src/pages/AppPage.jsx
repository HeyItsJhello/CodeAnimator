import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import "../App.css";

// Data imports
import {
  API_URL,
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_FONT,
  FONT_OPTIONS,
} from "../data/constants";
import { getTokenPatterns, tokenizeLine } from "../data/tokenizer";

// Utility functions
import {
  parseLineToken,
  checkApiStatus as checkApiStatusFn,
  buildTimingConfig,
  buildLineGroupsForApi,
  calculateLineGroupMap,
} from "../utils/functions";

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
  AnimationTypeSelector,
  FontSelector,
  DryRunModal,
} from "../Components";

function AppPage() {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  const SUBTITLE = "> render your code as animation // powered by manim";
  const [typed, setTyped] = useState("");
  const typedRef = useRef(0);
  useEffect(() => {
    typedRef.current = 0;
    setTyped("");
    const id = setInterval(() => {
      typedRef.current += 1;
      setTyped(SUBTITLE.slice(0, typedRef.current));
      if (typedRef.current >= SUBTITLE.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

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
  const [syntaxColors, setSyntaxColors] = useState({
    ...DEFAULT_SYNTAX_COLORS,
  });
  const [orientation, setOrientation] = useState("landscape");
  const [quality, setQuality] = useState("standard");
  const [animationTiming, setAnimationTiming] = useState({
    ...DEFAULT_TIMING_STR,
  });
  const [animationType, setAnimationType] = useState(DEFAULT_ANIMATION_TYPE);
  const [font, setFont] = useState(DEFAULT_FONT);

  // Line groups state
  const [lineGroups, setLineGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");
  const [shownLines, setShownLines] = useState(new Set());

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("starting");
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueTotal, setQueueTotal] = useState(null);

  // Dry-run state
  const [dryRunResult, setDryRunResult] = useState(null);
  const [showDryRunModal, setShowDryRunModal] = useState(false);

  // Modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitLineInput, setSplitLineInput] = useState("");
  const [showColorModal, setShowColorModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadAnotherModal, setShowUploadAnotherModal] = useState(false);

  // Video state
  const [completedVideoUrl, setCompletedVideoUrl] = useState(null);
  const [completedVideoFilename, setCompletedVideoFilename] = useState("");
  const [fromCache, setFromCache] = useState(false);

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
          alert(
            `Warning: Line ${lineNum} is outside range [${startLine}, ${endLine}]`,
          );
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
    setAnimationType(DEFAULT_ANIMATION_TYPE);
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

  // Core render helper — submits one render job and waits for completion via SSE
  const runRender = useCallback(async (config) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("config", JSON.stringify(config));

    const response = await fetch(`${API_URL}/api/animate`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) {
      const detail = result.detail;
      if (detail?.errors) throw new Error(detail.errors.join("\n"));
      throw new Error(detail || "Failed to generate animation");
    }

    const { taskId } = result;

    return new Promise((resolve, reject) => {
      const es = new EventSource(`${API_URL}/api/progress-stream/${taskId}`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLoadingProgress(data.progress ?? 0);
          setLoadingStatus(data.status || "processing");
          if (data.status === "queued") {
            setQueuePosition(data.queue_position ?? null);
            setQueueTotal(data.queue_total ?? null);
          } else {
            setQueuePosition(null);
            setQueueTotal(null);
          }
          if (data.status === "complete") {
            es.close();
            resolve({
              videoUrl:    `${API_URL}/api/stream/${data.videoId}`,
              downloadUrl: `${API_URL}/api/download/${data.videoId}`,
              filename:    data.filename,
              cached:      !!data.cached,
            });
          } else if (data.status === "error") {
            es.close();
            reject(new Error(data.detail || "Animation generation failed"));
          } else if (data.status === "timeout") {
            es.close();
            reject(new Error("Animation generation timed out"));
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };
      es.onerror = () => {
        es.close();
        reject(new Error("Lost connection to server"));
      };
    });
  }, [file]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Dry-run handler
  const handleDryRun = useCallback(async () => {
    if (!file) { alert("Please upload a file first"); return; }
    if (lineGroups.length === 0) { alert("Please add at least one line group first"); return; }

    const timingConfig = buildTimingConfig(animationTiming);
    const config = {
      scriptPath: fileName, startLine, endLine, includeComments,
      orientation, quality,
      lineGroups: buildLineGroupsForApi(lineGroups),
      syntaxColors, animationTiming: timingConfig, animationType, font,
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("config", JSON.stringify(config));

    try {
      const response = await fetch(`${API_URL}/api/dry-run`, { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        const err = data.detail?.errors ? data.detail.errors.join("\n") : (data.detail || "Dry run failed");
        throw new Error(err);
      }
      setDryRunResult(data);
      setShowDryRunModal(true);
    } catch (err) {
      alert(`Dry run failed: ${err.message}`);
    }
  }, [file, fileName, startLine, endLine, includeComments, orientation, quality,
      lineGroups, syntaxColors, animationTiming, animationType, font]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) { alert("Please upload a file"); return; }
    if (lineGroups.length === 0) { alert("Please add at least one line group"); return; }

    const timingConfig = buildTimingConfig(animationTiming);
    const config = {
      scriptPath: fileName,
      startLine, endLine, includeComments, orientation, quality,
      lineGroups: buildLineGroupsForApi(lineGroups),
      syntaxColors, animationTiming: timingConfig, animationType, font,
    };

    try {
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingStatus("starting");

      const result = await runRender(config);

      setIsLoading(false);
      setLoadingProgress(0);
      setFromCache(result.cached);
      setCompletedVideoUrl(result.videoUrl);
      setCompletedVideoFilename(result.filename);
      window._videoDownloadUrl = result.downloadUrl;
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

  // Debounced inputs for the tokenizer — avoids re-tokenizing on every keystroke
  const [debouncedContent, setDebouncedContent] = useState(fileContent);
  const [debouncedColors, setDebouncedColors]   = useState(syntaxColors);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedContent(fileContent), 150);
    return () => clearTimeout(t);
  }, [fileContent]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedColors(syntaxColors), 150);
    return () => clearTimeout(t);
  }, [syntaxColors]);

  const highlightedLines = useMemo(() => {
    if (!debouncedContent) return [];
    const lines    = debouncedContent.split("\n");
    const patterns = getTokenPatterns(fileExtension);
    return lines.map((line, idx) => ({
      lineNum: idx + 1,
      tokens: tokenizeLine(line, patterns, debouncedColors),
    }));
  }, [debouncedContent, fileExtension, debouncedColors]);

  const lineGroupMap = useMemo(() => {
    return calculateLineGroupMap(lineGroups, startLine, endLine);
  }, [lineGroups, startLine, endLine]);

  const fontFamily = useMemo(
    () => FONT_OPTIONS.find((f) => f.value === font)?.family ?? "monospace",
    [font],
  );

  return (
    <div className={`app${isDark ? " dark-theme" : ""}`}>
      <div className={`main-layout ${!fileContent ? "centered" : ""}`}>
        <motion.div
          className="container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <span className="corner-tl" aria-hidden="true" />
          <span className="corner-tr" aria-hidden="true" />
          <div className="nav-row">
            <Link to="/" className="back-to-home">← Back to Home</Link>
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {isDark ? "☀ Light" : "☾ Dark"}
            </button>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Code Animator<span className="cursor-blink">_</span>
          </motion.h1>
          <motion.p
            className="subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, delay: 0.3 }}
          >
            {typed}<span className="cursor-blink">_</span>
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

                  <AnimationTypeSelector
                    animationType={animationType}
                    onAnimationTypeChange={setAnimationType}
                  />

                  <FontSelector
                    font={font}
                    onFontChange={setFont}
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

                  <SubmitSection apiStatus={apiStatus} onDryRun={handleDryRun} />
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
              highlightedLines={highlightedLines}
              startLine={startLine}
              endLine={endLine}
              shownLines={shownLines}
              lineGroupMap={lineGroupMap}
              fontFamily={fontFamily}
              onOpenPreviewModal={() => setShowPreviewModal(true)}
            />
          )}
        </AnimatePresence>

        <LoadingModal
          isLoading={isLoading}
          loadingProgress={loadingProgress}
          loadingStatus={loadingStatus}
          queuePosition={queuePosition}
          queueTotal={queueTotal}
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
          fromCache={fromCache}
          onClose={handleCloseVideoModal}
          onDownload={handleDownloadVideo}
          onUploadNew={resetForNewFile}
        />

        <DryRunModal
          show={showDryRunModal}
          result={dryRunResult}
          onClose={() => setShowDryRunModal(false)}
          onRender={() => {
            setShowDryRunModal(false);
            handleSubmit({ preventDefault: () => {} });
          }}
        />
      </div>
    </div>
  );
}

export default AppPage;
