import { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import "../App.css";

import { API_URL, DEFAULT_TIMING, FONT_OPTIONS, QUALITY_OPTIONS } from "../config/constants";
import { getTokenPatterns, tokenizeLine } from "../config/tokenizer";
import { useFileUpload }        from "../hooks/useFileUpload";
import { useAnimationSettings } from "../hooks/useAnimationSettings";
import { useLineGroups, toApiGroups } from "../hooks/useLineGroups";
import { useRender }            from "../hooks/useRender";

import {
  ApiStatusBanner, LinesPanel, AnimationPanel, VideoPanel, LookPanel, SidebarLinks,
} from "../Components/FormSections";
import PreviewPanel from "../Components/PreviewPanel";
import FontScreen from "../Components/FontSelector";
import {
  LoadingModal, SplitModal, ColorModal, VideoCompleteModal, DryRunModal,
} from "../Components/Modals";

const LANGUAGES = {
  py: "Python", js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
  java: "Java", cpp: "C++", c: "C", h: "C", go: "Go", rs: "Rust", rb: "Ruby",
  php: "PHP", swift: "Swift", kt: "Kotlin", gd: "GDScript",
};

const ACCEPTED_EXTENSIONS = ".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.kt,.gd";

// Shown in the editor before a file is loaded: an empty file you drop code into.
function EmptyEditor({ onFiles }) {
  const [dragging, setDragging] = useState(false);

  const lines = [
    "",
    "Drop a code file here",
    "or click to browse.",
    "",
    "// Python, JavaScript, TypeScript, Go, Rust,",
    "// C++, Java, Swift, GDScript and more",
    "", "", "", "", "", "",
  ];

  return (
    <label
      htmlFor="file-upload"
      className={`empty-editor${dragging ? " empty-editor--dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      {lines.map((text, i) => (
        <span key={i} className="empty-editor__line">
          <span className="empty-editor__number">{i + 1}</span>
          <span className={text.startsWith("//") ? "empty-editor__comment" : "empty-editor__text"}>
            {text}
          </span>
        </span>
      ))}
    </label>
  );
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
  const [apiStatus, checkApiStatus] = useApiStatus();

  // null | "split" | "color" | "video" | "dryRun"
  const [modal, setModal] = useState(null);
  const [fontScreenOpen, setFontScreenOpen] = useState(false);
  const closeFontScreen = useCallback(() => setFontScreenOpen(false), []);

  // The font screen replaces the settings in the sidebar; return the user to where they were.
  const sidebarRef = useRef(null);
  const sidebarScroll = useRef(0);
  const openFontScreen = () => {
    sidebarScroll.current = sidebarRef.current?.scrollTop ?? 0;
    setFontScreenOpen(true);
  };
  useLayoutEffect(() => {
    if (sidebarRef.current) sidebarRef.current.scrollTop = fontScreenOpen ? 0 : sidebarScroll.current;
  }, [fontScreenOpen]);
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
  const loadFiles = (files) => handleFileUpload({ target: { files } });

  // Clicking a line number in the editor adds it to the group being typed.
  const addLineToGroup = (lineNum) =>
    setCurrentGroup((prev) => (prev.trim() ? `${prev.trim()} ${lineNum}` : String(lineNum)));

  const qualityLabel = QUALITY_OPTIONS.find((q) => q.value === quality)?.size ?? quality;
  const statusItems = [
    `Lines ${startLine}–${endLine}`,
    `${lineGroups.length} ${lineGroups.length === 1 ? "group" : "groups"}`,
    LANGUAGES[fileExtension.slice(1)] ?? fileExtension.slice(1),
    `${orientation === "portrait" ? "Portrait" : "Landscape"}, ${qualityLabel}`,
  ];
  const ready = apiStatus === "awake";

  return (
    <div className="app">
      <input
        type="file" id="file-upload" className="visually-hidden"
        accept={ACCEPTED_EXTENSIONS} onChange={handleFileUpload}
      />

      <header className="topbar">
        <Link to="/landing" className="topbar__logo">
          <span className="logo-mark" aria-hidden="true" />
          Code Animator
        </Link>

        {fileName && (
          <div className="topbar__file">
            <span className="topbar__filename">{fileName}</span>
            <span className="topbar__meta">{totalLines} lines</span>
            <label htmlFor="file-upload" className="topbar__change">Change file</label>
          </div>
        )}

        <div className="topbar__actions">
          {fileContent && (
            <>
              <button type="button" className="btn-dry-run" disabled={!ready} onClick={handleDryRun}>
                Dry run
              </button>
              <button type="submit" form="render-form" className="btn-submit" disabled={!ready}>
                {ready ? "Generate video" : "Waiting for server…"}
              </button>
            </>
          )}
        </div>
      </header>

      <ApiStatusBanner apiStatus={apiStatus} onRetry={checkApiStatus} />

      <main className={`workspace${fileContent ? "" : " workspace--empty"}`}>
        <section className="editor" aria-label="Code preview">
          {fileContent ? (
            <PreviewPanel
              fileName={fileName}
              fileContent={fileContent}
              highlightedLines={highlightedLines}
              startLine={startLine} endLine={endLine}
              lineGroupMap={lineGroupMap}
              fontFamily={fontFamily}
              background={syntaxColors.background}
              statusItems={statusItems}
              onLineClick={addLineToGroup}
              onEditColors={() => setModal("color")}
            />
          ) : (
            <EmptyEditor onFiles={loadFiles} />
          )}
        </section>

        {fileContent && (
          <aside className="sidebar" aria-label="Video settings" ref={sidebarRef}>
            {fontScreenOpen && (
              <FontScreen font={font} onFontChange={setFont} onClose={closeFontScreen} />
            )}
            <form id="render-form" hidden={fontScreenOpen} onSubmit={(e) => { e.preventDefault(); startRender(); }}>
              <LinesPanel
                startLine={startLine} endLine={endLine} totalLines={totalLines}
                onStartLineChange={setStartLine} onEndLineChange={setEndLine}
                lineGroups={lineGroups} currentGroup={currentGroup}
                onCurrentGroupChange={setCurrentGroup}
                onAddLineGroup={addLineGroup} onRemoveLineGroup={removeLineGroup}
                onClearAllGroups={clearAll} onOpenSplitModal={() => setModal("split")}
              />
              <AnimationPanel
                animationType={animationType} onAnimationTypeChange={setAnimationType}
                animationTiming={animationTiming}
                onUpdateTiming={updateTiming} onResetTiming={resetTiming}
              />
              <VideoPanel
                orientation={orientation} onOrientationChange={setOrientation}
                quality={quality} onQualityChange={setQuality}
              />
              <LookPanel
                syntaxColors={syntaxColors} onOpenColorModal={() => setModal("color")}
                font={font} onOpenFontScreen={openFontScreen}
                includeComments={includeComments} onIncludeCommentsChange={setIncludeComments}
              />
            </form>
            {!fontScreenOpen && <SidebarLinks />}
          </aside>
        )}
      </main>

      <LoadingModal
        isLoading={isLoading} loadingProgress={loadingProgress} loadingStatus={loadingStatus}
        fileName={fileName}
      />
      <SplitModal
        show={modal === "split"} startLine={startLine} endLine={endLine}
        onAddSplit={addSplit} onClose={closeModal}
      />
      <ColorModal
        show={modal === "color"} syntaxColors={syntaxColors}
        onSyntaxColorsChange={setSyntaxColors} onClose={closeModal}
        previewLines={highlightedLines.filter(({ lineNum }) => lineNum >= startLine && lineNum <= endLine)}
        fontFamily={fontFamily}
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
  );
}

export default AppPage;
