import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import "../App.css";

import { API_URL, DEFAULT_TIMING, FONT_OPTIONS } from "../config/constants";
import { getTokenPatterns, tokenizeLine } from "../config/tokenizer";
import { useFileUpload }        from "../hooks/useFileUpload";
import { useAnimationSettings } from "../hooks/useAnimationSettings";
import { useLineGroups, toApiGroups } from "../hooks/useLineGroups";
import { useRender }            from "../hooks/useRender";

import {
  ApiStatusBanner, FileUploadSection, LineRangeSection, CommentSettings,
  ColorSettings, OrientationToggle, QualityPreset, TimingSettings,
  AnimationTypeSelector, LineGroupsSection, SubmitSection,
} from "../Components/FormSections";
import FontSelector from "../Components/FontSelector";
import PreviewPanel from "../Components/PreviewPanel";
import {
  LoadingModal, SplitModal, ColorModal, PreviewModal, VideoCompleteModal, DryRunModal,
} from "../Components/Modals";

const SUBTITLE = "> render your code as animation // powered by remotion";

function useTypewriter(text, intervalMs = 28) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= text.length) return;
    const id = setTimeout(() => setCount(count + 1), intervalMs);
    return () => clearTimeout(id);
  }, [count, text, intervalMs]);
  return text.slice(0, count);
}

// Sets "awake", "error", or "waking" (request timed out — retries every 3s).
async function pingApi(setStatus) {
  try {
    const response = await fetch(`${API_URL}/`, { signal: AbortSignal.timeout(5000) });
    setStatus(response.ok ? "awake" : "error");
  } catch (err) {
    if (err.name === "TimeoutError") {
      setStatus("waking");
      setTimeout(() => pingApi(setStatus), 3000);
    } else {
      setStatus("error");
    }
  }
}

function useApiStatus() {
  const [apiStatus, setApiStatus] = useState("awake");
  const check = useCallback(() => pingApi(setApiStatus), []);
  useEffect(() => { check(); }, [check]);
  return [apiStatus, check];
}

// Timing inputs hold strings; blank or invalid values fall back to defaults.
function toTimingConfig(animationTiming) {
  return Object.fromEntries(Object.entries(DEFAULT_TIMING).map(([key, fallback]) => {
    const num = parseFloat(animationTiming[key]);
    return [key, Number.isFinite(num) && num >= 0 ? num : fallback];
  }));
}

function AppPage() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const toggleTheme = () => {
    localStorage.setItem("theme", isDark ? "light" : "dark");
    setIsDark(!isDark);
  };

  const typed = useTypewriter(SUBTITLE);
  const [apiStatus, checkApiStatus] = useApiStatus();

  // null | "split" | "color" | "preview" | "video" | "dryRun"
  const [modal, setModal] = useState(null);
  const [dryRunResult, setDryRunResult] = useState(null);
  const closeModal = () => setModal(null);

  const upload = useFileUpload();
  const {
    file, fileName, fileContent, totalLines,
    startLine, endLine, setStartLine, setEndLine, handleFileUpload,
  } = upload;

  const {
    includeComments, setIncludeComments,
    syntaxColors, setSyntaxColors,
    orientation, setOrientation,
    quality, setQuality,
    animationTiming, updateTiming, resetTiming,
    animationType, setAnimationType,
    font, setFont, resetSettings,
  } = useAnimationSettings();

  const {
    lineGroups, currentGroup, lineGroupMap,
    setCurrentGroup, addLineGroup, removeLineGroup, addSplit, clearAll,
  } = useLineGroups(startLine, endLine);

  const {
    isLoading, loadingProgress, loadingStatus,
    videoUrl, submitRender, submitDryRun, download, resetVideo,
  } = useRender(file);

  const buildConfig = () => ({
    scriptPath:      fileName,
    startLine, endLine, includeComments, orientation, quality,
    lineGroups:      toApiGroups(lineGroups),
    syntaxColors,
    animationTiming: toTimingConfig(animationTiming),
    animationType,   font,
  });

  // Returns false (after alerting) when the form isn't ready to submit.
  const canSubmit = () => {
    if (!file)                   { alert("Please upload a file");               return false; }
    if (lineGroups.length === 0) { alert("Please add at least one line group"); return false; }
    return true;
  };

  const startRender = async () => {
    if (!canSubmit()) return;
    try {
      await submitRender(buildConfig());
      setModal("video");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDryRun = async () => {
    if (!canSubmit()) return;
    try {
      setDryRunResult(await submitDryRun(buildConfig()));
      setModal("dryRun");
    } catch (err) {
      alert(`Dry run failed: ${err.message}`);
    }
  };

  const closeVideoModal = () => {
    closeModal();
    resetVideo();
  };

  const resetForNewFile = () => {
    upload.reset();
    clearAll();
    resetSettings();
    closeVideoModal();
  };

  const fileExtension = fileName ? "." + fileName.split(".").pop() : "";

  const highlightedLines = useMemo(() => {
    if (!fileContent) return [];
    const patterns = getTokenPatterns(fileExtension);
    return fileContent.split("\n").map((line, idx) => ({
      lineNum: idx + 1,
      tokens:  tokenizeLine(line, patterns, syntaxColors),
    }));
  }, [fileContent, fileExtension, syntaxColors]);

  const fontFamily = FONT_OPTIONS.find((f) => f.value === font)?.family ?? "monospace";

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
            <Link to="/landing" className="back-to-home">← Back to Home</Link>
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {isDark ? "☀ Light" : "☾ Dark"}
            </button>
          </div>

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
            transition={{ duration: 0.1, delay: 0.3 }}
          >
            {typed}
          </motion.p>

          <ApiStatusBanner apiStatus={apiStatus} onRetry={checkApiStatus} />

          <form onSubmit={(e) => { e.preventDefault(); startRender(); }}>
            <FileUploadSection fileName={fileName} totalLines={totalLines} onFileUpload={handleFileUpload} />

            <AnimatePresence>
              {totalLines > 0 && (
                <>
                  <LineRangeSection
                    startLine={startLine} endLine={endLine} totalLines={totalLines}
                    onStartLineChange={setStartLine} onEndLineChange={setEndLine}
                  />
                  <CommentSettings includeComments={includeComments} onIncludeCommentsChange={setIncludeComments} />
                  <ColorSettings syntaxColors={syntaxColors} onOpenColorModal={() => setModal("color")} />
                  <OrientationToggle orientation={orientation} onOrientationChange={setOrientation} />
                  <QualityPreset quality={quality} onQualityChange={setQuality} />
                  <TimingSettings
                    animationTiming={animationTiming}
                    onUpdateTiming={updateTiming} onResetTiming={resetTiming}
                  />
                  <AnimationTypeSelector animationType={animationType} onAnimationTypeChange={setAnimationType} />
                  <FontSelector font={font} onFontChange={setFont} />
                  <LineGroupsSection
                    lineGroups={lineGroups} currentGroup={currentGroup}
                    onCurrentGroupChange={setCurrentGroup}
                    onAddLineGroup={addLineGroup} onRemoveLineGroup={removeLineGroup}
                    onClearAllGroups={clearAll} onOpenSplitModal={() => setModal("split")}
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
              fileName={fileName} fileContent={fileContent}
              highlightedLines={highlightedLines}
              startLine={startLine} endLine={endLine}
              lineGroupMap={lineGroupMap}
              fontFamily={fontFamily} onOpenPreviewModal={() => setModal("preview")}
            />
          )}
        </AnimatePresence>

        <LoadingModal isLoading={isLoading} loadingProgress={loadingProgress} loadingStatus={loadingStatus} />
        <SplitModal
          show={modal === "split"} startLine={startLine} endLine={endLine}
          onAddSplit={addSplit} onClose={closeModal}
        />
        <ColorModal
          show={modal === "color"} syntaxColors={syntaxColors}
          onSyntaxColorsChange={setSyntaxColors} onClose={closeModal}
        />
        <PreviewModal
          show={modal === "preview"} highlightedLines={highlightedLines}
          syntaxColors={syntaxColors} startLine={startLine} endLine={endLine}
          onClose={closeModal} onEditColors={() => setModal("color")}
        />
        <VideoCompleteModal
          show={modal === "video"} videoUrl={videoUrl}
          onClose={closeVideoModal} onDownload={download} onUploadNew={resetForNewFile}
        />
        <DryRunModal
          show={modal === "dryRun"} result={dryRunResult}
          onClose={closeModal}
          onRender={() => { closeModal(); startRender(); }}
        />
      </div>
    </div>
  );
}

export default AppPage;
