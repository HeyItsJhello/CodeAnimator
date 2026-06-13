import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import "../App.css";

import {
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
  DEFAULT_TIMING,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_FONT,
  FONT_OPTIONS,
} from "../data/constants";
import { getTokenPatterns, tokenizeLine } from "../data/tokenizer";
import { checkApiStatus as pingApi, buildTimingConfig, buildLineGroupsForApi, calculateLineGroupMap } from "../utils/functions";

import { useTheme }      from "../hooks/useTheme";
import { useTypewriter } from "../hooks/useTypewriter";
import { useLineGroups } from "../hooks/useLineGroups";
import { useRender }     from "../hooks/useRender";

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

const SUBTITLE = "> render your code as animation // powered by remotion";

function AppPage() {
  const { isDark, toggleTheme } = useTheme();
  const typed = useTypewriter(SUBTITLE);

  // ── File ──────────────────────────────────────────────────────────────────
  const [file,        setFile]        = useState(null);
  const [fileName,    setFileName]    = useState("");
  const [fileContent, setFileContent] = useState("");
  const [totalLines,  setTotalLines]  = useState(0);

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (!uploaded) return;
    setFile(uploaded);
    setFileName(uploaded.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content  = ev.target.result;
      const numLines = content.split("\n").length;
      setFileContent(content);
      setTotalLines(numLines);
      setStartLine(1);
      setEndLine(numLines);
    };
    reader.readAsText(uploaded);
  };

  // ── Line range ────────────────────────────────────────────────────────────
  const [startLine, setStartLine] = useState(1);
  const [endLine,   setEndLine]   = useState(1);

  // ── Settings ──────────────────────────────────────────────────────────────
  const [includeComments, setIncludeComments] = useState(true);
  const [syntaxColors,    setSyntaxColors]    = useState({ ...DEFAULT_SYNTAX_COLORS });
  const [orientation,     setOrientation]     = useState("landscape");
  const [quality,         setQuality]         = useState("standard");
  const [animationTiming, setAnimationTiming] = useState({ ...DEFAULT_TIMING_STR });
  const [animationType,   setAnimationType]   = useState(DEFAULT_ANIMATION_TYPE);
  const [font,            setFont]            = useState(DEFAULT_FONT);

  const updateTiming = (key, value) =>
    setAnimationTiming((prev) => ({ ...prev, [key]: value }));
  const resetTiming = () => setAnimationTiming({ ...DEFAULT_TIMING_STR });

  // ── Line groups ───────────────────────────────────────────────────────────
  const {
    lineGroups, currentGroup, shownLines,
    setCurrentGroup, addLineGroup, removeLineGroup, addSplit, clearAll,
  } = useLineGroups(startLine, endLine);

  // ── API health ────────────────────────────────────────────────────────────
  const [apiStatus, setApiStatus] = useState("awake");

  const checkApiStatus = useCallback(() => pingApi(setApiStatus), []);
  useEffect(() => { checkApiStatus(); }, [checkApiStatus]);

  // ── Render / dry-run ──────────────────────────────────────────────────────
  const {
    isLoading, loadingProgress, loadingStatus, queuePosition, queueTotal,
    videoUrl, videoFilename,
    submitRender, submitDryRun, download, resetVideo,
  } = useRender(file);

  const buildConfig = useCallback(() => ({
    scriptPath:      fileName,
    startLine, endLine, includeComments, orientation, quality,
    lineGroups:      buildLineGroupsForApi(lineGroups),
    syntaxColors,
    animationTiming: buildTimingConfig(animationTiming),
    animationType,   font,
  }), [fileName, startLine, endLine, includeComments, orientation, quality,
       lineGroups, syntaxColors, animationTiming, animationType, font]);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showSplitModal,   setShowSplitModal]   = useState(false);
  const [splitLineInput,   setSplitLineInput]   = useState("");
  const [showColorModal,   setShowColorModal]   = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVideoModal,   setShowVideoModal]   = useState(false);
  const [dryRunResult,     setDryRunResult]     = useState(null);
  const [showDryRunModal,  setShowDryRunModal]  = useState(false);

  const handleSplitAdd = () => {
    const lineNum = parseInt(splitLineInput, 10);
    if (isNaN(lineNum)) { alert("Please enter a valid line number"); return; }
    if (addSplit(lineNum)) {
      setSplitLineInput("");
      setShowSplitModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file)                  { alert("Please upload a file");                  return; }
    if (lineGroups.length === 0) { alert("Please add at least one line group"); return; }
    try {
      await submitRender(buildConfig());
      setShowVideoModal(true);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDryRun = useCallback(async () => {
    if (!file)                  { alert("Please upload a file first");                  return; }
    if (lineGroups.length === 0) { alert("Please add at least one line group first"); return; }
    try {
      const result = await submitDryRun(buildConfig());
      setDryRunResult(result);
      setShowDryRunModal(true);
    } catch (err) {
      alert(`Dry run failed: ${err.message}`);
    }
  }, [file, lineGroups, submitDryRun, buildConfig]);

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    resetVideo();
  };

  const resetForNewFile = () => {
    setFile(null);
    setFileName("");
    setFileContent("");
    setTotalLines(0);
    setStartLine(1);
    setEndLine(1);
    clearAll();
    setQuality("standard");
    setAnimationType(DEFAULT_ANIMATION_TYPE);
    handleCloseVideoModal();
  };

  // ── Preview highlighting ──────────────────────────────────────────────────
  const fileExtension = fileName ? "." + fileName.split(".").pop() : "";

  const [debouncedContent, setDebouncedContent] = useState(fileContent);
  const [debouncedColors,  setDebouncedColors]  = useState(syntaxColors);
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
      tokens:  tokenizeLine(line, patterns, debouncedColors),
    }));
  }, [debouncedContent, fileExtension, debouncedColors]);

  const lineGroupMap = useMemo(
    () => calculateLineGroupMap(lineGroups, startLine, endLine),
    [lineGroups, startLine, endLine],
  );

  const fontFamily = useMemo(
    () => FONT_OPTIONS.find((f) => f.value === font)?.family ?? "monospace",
    [font],
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
                    onClearAllGroups={clearAll}
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
          onAddSplit={handleSplitAdd}
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
          show={showVideoModal}
          completedVideoUrl={videoUrl}
          onClose={handleCloseVideoModal}
          onDownload={download}
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
