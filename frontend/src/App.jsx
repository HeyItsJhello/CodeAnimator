import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

// API URL - uses environment variable in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Default syntax highlighting colors (Manim color names)
const DEFAULT_SYNTAX_COLORS = {
  keywords: "#9b59b6", // PURPLE
  types: "#3498db", // BLUE
  functions: "#3498db", // BLUE
  strings: "#2ecc71", // GREEN
  numbers: "#e67e22", // ORANGE
  comments: "#7f8c8d", // GRAY
  decorators: "#f1c40f", // YELLOW
  default: "#ffffff", // WHITE
};

const DEFAULT_TIMING = {
  initialDelay: 1.5,
  lineSlideIn: 0.4,
  pauseBetweenGroups: 0.2,
  finalPause: 2.0,
};

const DEFAULT_TIMING_STR = Object.fromEntries(
  Object.entries(DEFAULT_TIMING).map(([k, v]) => [k, String(v)]),
);

// Simple syntax highlighter patterns for preview
// These patterns give a reasonable approximation of Pygments tokenization
const getTokenPatterns = (fileExtension) => {
  const ext = fileExtension?.toLowerCase() || "";

  // Map file extension to language
  const extToLang = {
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",
    ".h": "cpp",
    ".c": "c",
    ".py": "py",
    ".js": "js",
    ".jsx": "js",
    ".ts": "js",
    ".tsx": "js",
    ".mjs": "js",
    ".java": "java",
    ".go": "go",
    ".rs": "rs",
    ".rb": "rb",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kt",
    ".kts": "kt",
    ".gd": "gd",
  };

  const lang = extToLang[ext] || "cpp";
  const isCLike = ["cpp", "c"].includes(lang);

  // Common patterns for most languages
  // NOTE: Order matters - patterns applied later override earlier ones
  const basePatterns = [
    // Multi-line comments (must come before single-line)
    { type: "comments", pattern: /\/\*[\s\S]*?\*\//g },
    // Single-line comments
    { type: "comments", pattern: /\/\/.*$/gm },
    // Python/Ruby style comments (NOT for C/C++ - those use # for preprocessor)
    ...(!isCLike ? [{ type: "comments", pattern: /#.*$/gm }] : []),
    // Strings (double and single quotes)
    { type: "strings", pattern: /"(?:[^"\\]|\\.)*"/g },
    { type: "strings", pattern: /'(?:[^'\\]|\\.)*'/g },
    // Template literals (JS/TS)
    { type: "strings", pattern: /`(?:[^`\\]|\\.)*`/g },
    // Numbers (integers, floats, hex, etc.)
    { type: "numbers", pattern: /\b0x[0-9a-fA-F]+\b/g },
    { type: "numbers", pattern: /\b0b[01]+\b/g },
    { type: "numbers", pattern: /\b\d+\.?\d*(?:[eE][+-]?\d+)?[fFlL]?\b/g },
  ];

  // C/C++ preprocessor patterns (match Pygments behavior)
  // #include, #define, etc. -> keywords (purple)
  // <file.h> after #include -> comments (gray, matches PreprocFile token)
  const preprocessorPatterns = isCLike
    ? [
        {
          type: "keywords",
          pattern:
            /^[ \t]*#\s*(include|define|undef|ifdef|ifndef|if|else|elif|endif|error|pragma|line)\b/gm,
        },
        { type: "comments", pattern: /<[a-zA-Z0-9_./]+>/g }, // <iostream>, <stdio.h>, etc.
      ]
    : [];

  // Language-specific keywords
  // Primitive types (int, void, char, etc.) are included here as keywords (purple) to match Pygments Token.Keyword.Type
  const keywordsByLang = {
    cpp: /\b(if|else|for|while|do|switch|case|break|continue|return|class|struct|public|private|protected|virtual|override|const|static|new|delete|try|catch|throw|template|typename|sizeof|typedef|enum|union|extern|inline|volatile|register|true|false|nullptr|NULL|this|operator|friend|explicit|mutable|constexpr|noexcept|decltype|final|int|char|float|double|bool|void|long|short|unsigned|signed|auto|wchar_t|char16_t|char32_t)\b/g,
    c: /\b(if|else|for|while|do|switch|case|break|continue|return|struct|const|static|sizeof|typedef|enum|union|extern|inline|volatile|register|NULL|int|char|float|double|void|long|short|unsigned|signed)\b/g,
    py: /\b(if|elif|else|for|while|try|except|finally|with|as|def|class|return|yield|import|from|raise|pass|break|continue|and|or|not|in|is|lambda|True|False|None|self|async|await|global|nonlocal)\b/g,
    js: /\b(if|else|for|while|do|switch|case|break|continue|return|function|class|const|let|var|new|delete|try|catch|throw|finally|typeof|instanceof|this|super|import|export|default|from|as|async|await|yield|true|false|null|undefined|of|in)\b/g,
    java: /\b(if|else|for|while|do|switch|case|break|continue|return|class|interface|extends|implements|public|private|protected|static|final|void|int|char|float|double|boolean|long|short|byte|new|try|catch|throw|throws|finally|this|super|import|package|true|false|null|abstract|synchronized|volatile|transient|native|strictfp|enum|assert|instanceof)\b/g,
    go: /\b(if|else|for|switch|case|break|continue|return|func|type|struct|interface|const|var|package|import|defer|go|chan|select|range|map|make|new|true|false|nil|iota|append|cap|close|copy|delete|len|panic|print|println|recover)\b/g,
    rs: /\b(if|else|for|while|loop|match|break|continue|return|fn|struct|enum|impl|trait|pub|mut|const|static|let|use|mod|crate|self|super|where|async|await|move|ref|true|false|Some|None|Ok|Err|Self|dyn|unsafe|extern)\b/g,
    rb: /\b(if|elsif|else|unless|case|when|while|until|for|do|end|def|class|module|return|yield|begin|rescue|ensure|raise|break|next|redo|retry|self|super|true|false|nil|and|or|not|in|then|alias|defined\?|__FILE__|__LINE__)\b/g,
    php: /\b(if|elseif|else|for|foreach|while|do|switch|case|break|continue|return|function|class|interface|extends|implements|public|private|protected|static|final|abstract|const|new|try|catch|throw|finally|true|false|null|echo|print|require|include|use|namespace|trait|yield|clone|instanceof)\b/g,
    swift:
      /\b(if|else|for|while|repeat|switch|case|break|continue|return|func|class|struct|enum|protocol|extension|public|private|internal|fileprivate|open|static|final|let|var|guard|defer|do|try|catch|throw|throws|rethrows|true|false|nil|self|super|init|deinit|subscript|typealias|associatedtype|where|as|is|in|inout|mutating|nonmutating|lazy|weak|unowned|optional|required|convenience|override|dynamic|indirect|prefix|postfix|operator|precedencegroup)\b/g,
    kt: /\b(if|else|for|while|do|when|break|continue|return|fun|class|interface|object|val|var|constructor|init|companion|by|get|set|public|private|protected|internal|open|final|abstract|sealed|data|inner|enum|annotation|try|catch|throw|finally|true|false|null|this|super|is|as|in|out|vararg|inline|noinline|crossinline|reified|suspend|override|lateinit|const|tailrec|operator|infix|external|typealias|import|package)\b/g,
    gd: /\b(if|elif|else|for|while|match|break|continue|return|pass|func|class|extends|class_name|signal|export|onready|var|const|enum|static|remote|master|puppet|slave|sync|true|false|null|self|tool|preload|yield|assert|breakpoint|PI|TAU|INF|NAN|and|or|not|in|is|as)\b/g,
  };

  // Type keywords by language
  // Note: namespace, using are Keyword.Namespace in Pygments -> types color
  // std, cout, cin, endl, cerr are Name.Builtin in Pygments -> types color
  // Primitive types (int, void, etc.) are now in keywordsByLang (purple)
  const typesByLang = {
    cpp: /\b(size_t|string|vector|map|set|list|array|pair|tuple|unique_ptr|shared_ptr|weak_ptr|optional|variant|any|nullptr_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|ptrdiff_t|intptr_t|uintptr_t|namespace|using|std|cout|cin|endl|cerr|clog|wcout|wcin|wcerr|wclog)\b/g,
    c: /\b(size_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|ptrdiff_t|intptr_t|uintptr_t|FILE)\b/g,
    py: /\b(int|float|str|bool|list|dict|set|tuple|bytes|bytearray|object|type|None|Any|Union|Optional|List|Dict|Set|Tuple|Callable|Iterable|Iterator|Generator|Sequence|Mapping|MutableMapping|MutableSequence|MutableSet)\b/g,
    js: /\b(Array|Object|String|Number|Boolean|Function|Symbol|BigInt|Map|Set|WeakMap|WeakSet|Promise|Date|RegExp|Error|TypeError|ReferenceError|SyntaxError|RangeError|EvalError|URIError|JSON|Math|console|window|document|HTMLElement|Element|Node|Event|EventTarget|NodeList|HTMLCollection)\b/g,
    java: /\b(int|char|float|double|boolean|byte|short|long|void|String|Integer|Character|Float|Double|Boolean|Byte|Short|Long|Object|Class|System|Math|List|ArrayList|LinkedList|Map|HashMap|TreeMap|Set|HashSet|TreeSet|Queue|Stack|Vector|Collection|Iterator|Iterable|Comparable|Comparator|Exception|RuntimeException|Throwable|Thread|Runnable)\b/g,
    go: /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|byte|rune|string|bool|error|any|comparable)\b/g,
    rs: /\b(i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Rc|Arc|Cell|RefCell|Option|Result|HashMap|HashSet|BTreeMap|BTreeSet|VecDeque|LinkedList|BinaryHeap|Cow|Pin|PhantomData)\b/g,
    swift:
      /\b(Int|Int8|Int16|Int32|Int64|UInt|UInt8|UInt16|UInt32|UInt64|Float|Double|Bool|String|Character|Array|Dictionary|Set|Optional|Any|AnyObject|Void|Never|Error|Result|Sequence|Collection|IteratorProtocol|Comparable|Equatable|Hashable|Codable|Encodable|Decodable)\b/g,
    gd: /\b(Node|Node2D|Node3D|Control|Camera2D|Camera3D|Sprite2D|Sprite3D|RigidBody2D|RigidBody3D|CharacterBody2D|CharacterBody3D|Area2D|Area3D|CollisionShape2D|CollisionShape3D|Timer|AnimationPlayer|AudioStreamPlayer|Vector2|Vector3|Vector4|Vector2i|Vector3i|Vector4i|Color|Rect2|Rect2i|Transform2D|Transform3D|Basis|Quaternion|AABB|Plane|Array|Dictionary|PackedByteArray|PackedInt32Array|PackedInt64Array|PackedFloat32Array|PackedFloat64Array|PackedStringArray|PackedVector2Array|PackedVector3Array|PackedColorArray|Resource|Texture|Texture2D|PackedScene|Script|Object|RefCounted|String|StringName|NodePath|int|float|bool)\b/g,
  };

  // Function patterns
  const functionPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g;

  // Decorator patterns
  const decoratorPatterns = {
    py: /@[a-zA-Z_][a-zA-Z0-9_.]*/g,
    java: /@[a-zA-Z_][a-zA-Z0-9_]*/g,
    kt: /@[a-zA-Z_][a-zA-Z0-9_]*/g,
    gd: /@[a-zA-Z_][a-zA-Z0-9_]*/g,
  };

  // GDScript node reference patterns ($NodePath)
  const nodeReferencePatterns = {
    gd: /\$[a-zA-Z_][a-zA-Z0-9_]*/g,
  };

  return {
    base: basePatterns,
    preprocessor: preprocessorPatterns,
    keywords: keywordsByLang[lang] || keywordsByLang.cpp,
    types: typesByLang[lang] || null,
    functions: functionPattern,
    decorators: decoratorPatterns[lang] || null,
    nodeReferences: nodeReferencePatterns[lang] || null,
  };
};

// Tokenize a line of code for syntax highlighting preview
const tokenizeLine = (line, patterns, colors) => {
  if (!line) return [{ text: " ", color: colors.default }];

  // Create an array to track color for each character position
  const charColors = new Array(line.length).fill(colors.default);

  // Apply patterns in order of precedence (comments and strings first, then others)
  const applyPattern = (pattern, colorKey) => {
    if (!pattern) return;
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      for (let i = start; i < end && i < charColors.length; i++) {
        charColors[i] = colors[colorKey];
      }
    }
  };

  // Apply base patterns (comments, strings, numbers)
  patterns.base.forEach((p) => applyPattern(p.pattern, p.type));

  // Apply C/C++ preprocessor patterns (override base patterns for #include, etc.)
  if (patterns.preprocessor) {
    patterns.preprocessor.forEach((p) => applyPattern(p.pattern, p.type));
  }

  // Apply types before keywords (more specific)
  if (patterns.types) applyPattern(patterns.types, "types");

  // Apply keywords
  if (patterns.keywords) applyPattern(patterns.keywords, "keywords");

  // Apply node references (GDScript $NodePath syntax) - color as types
  if (patterns.nodeReferences) applyPattern(patterns.nodeReferences, "types");

  // Apply functions (but not if already colored by keywords/types)
  if (patterns.functions) {
    const regex = new RegExp(
      patterns.functions.source,
      patterns.functions.flags,
    );
    let match;
    while ((match = regex.exec(line)) !== null) {
      const funcName = match[1];
      const start = match.index;
      const end = start + funcName.length;
      // Only color as function if not already a keyword/type
      let isKeywordOrType = false;
      for (let i = start; i < end; i++) {
        if (
          charColors[i] === colors.keywords ||
          charColors[i] === colors.types
        ) {
          isKeywordOrType = true;
          break;
        }
      }
      if (!isKeywordOrType) {
        for (let i = start; i < end && i < charColors.length; i++) {
          charColors[i] = colors.functions;
        }
      }
    }
  }

  // Apply decorators
  if (patterns.decorators) applyPattern(patterns.decorators, "decorators");

  // Group consecutive characters with same color into spans
  const spans = [];
  let currentSpan = { text: "", color: charColors[0] };

  for (let i = 0; i < line.length; i++) {
    if (charColors[i] === currentSpan.color) {
      currentSpan.text += line[i];
    } else {
      if (currentSpan.text) spans.push(currentSpan);
      currentSpan = { text: line[i], color: charColors[i] };
    }
  }
  if (currentSpan.text) spans.push(currentSpan);

  return spans.length > 0 ? spans : [{ text: " ", color: colors.default }];
};

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(1);
  const [includeComments, setIncludeComments] = useState(true);
  const [lineGroups, setLineGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState("");
  const [shownLines, setShownLines] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("starting");
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitLineInput, setSplitLineInput] = useState("");
  const [showColorModal, setShowColorModal] = useState(false);
  const [syntaxColors, setSyntaxColors] = useState({
    ...DEFAULT_SYNTAX_COLORS,
  });
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showUploadAnotherModal, setShowUploadAnotherModal] = useState(false);
  const [completedVideoUrl, setCompletedVideoUrl] = useState(null);
  const [completedVideoFilename, setCompletedVideoFilename] = useState("");
  const [orientation, setOrientation] = useState("landscape"); // 'landscape' or 'portrait'
  const [quality, setQuality] = useState("standard"); // 'fast', 'standard', 'high'
  const [animationTiming, setAnimationTiming] = useState({
    ...DEFAULT_TIMING_STR,
  });
  const [apiStatus, setApiStatus] = useState("checking"); // 'checking', 'awake', 'waking', 'error'

  // Check if the API is awake on page load
  const checkApiStatus = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${API_URL}/`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        setApiStatus("awake");
      } else {
        setApiStatus("error");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        setApiStatus("waking");
        setTimeout(checkApiStatus, 3000);
      }
    }
  }, []);

  useEffect(() => {
    checkApiStatus();
  }, [checkApiStatus]);

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

  const parseLineToken = (token) => {
    if (token.includes("-") && !token.match(/^-?\d+$/)) {
      const parts = token.split("-");

      if (parts.length != 2) return [];

      const start = parseInt(parts[0]);
      const end = parseInt(parts[1]);

      // Make sure both parts are ints so everything works | Test cases would be like a-5
      if (isNaN(start) || isNaN(end)) return [];

      // Correct ordering in case like 5-1
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      const result = [];

      // now to push to the results, since it is just an incrementing loop going to the maxLineNum
      for (let i = min; i <= max; i++) {
        result.push(i);
      }
      return result;
    }

    // Single number case
    const num = parseInt(token);
    return isNaN(num) ? [] : [num];
  };
  const addLineGroup = () => {
    if (!currentGroup.trim()) {
      setLineGroups([...lineGroups, "ALL_REMAINING"]);
      const newShownLines = new Set(shownLines);
      // Only add lines that aren't already shown
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

      // Validate line numbers
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
    } catch (error) {
      alert("Invalid input. Please enter space-separated numbers");
    }
  };

  const removeLineGroup = (index) => {
    const newGroups = lineGroups.filter((_, i) => i !== index);
    setLineGroups(newGroups);

    // Recalculate shown lines from remaining groups
    const newShownLines = new Set();

    // First, add all explicit line groups
    newGroups.forEach((g) => {
      if (Array.isArray(g)) {
        g.forEach((line) => newShownLines.add(line));
      } else if (typeof g === "object" && g.type === "SPLIT") {
        newShownLines.add(g.line);
      }
    });

    // Then, if there's an ALL_REMAINING, add lines not already in groups
    const hasAllRemaining = newGroups.some((g) => g === "ALL_REMAINING");
    if (hasAllRemaining) {
      for (let i = startLine; i <= endLine; i++) {
        newShownLines.add(i);
      }
    }

    setShownLines(newShownLines);
  };

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

  const handleDownloadVideo = () => {
    // Use the download URL (not the stream URL used for preview)
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

  const clearAllGroups = () => {
    setLineGroups([]);
    setShownLines(new Set());
    setCurrentGroup("");
  };

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

    // Add the SPLIT group
    setLineGroups([...lineGroups, { type: "SPLIT", line: lineNum }]);
    const newShownLines = new Set(shownLines);
    newShownLines.add(lineNum);
    setShownLines(newShownLines);
    setSplitLineInput("");
    setShowSplitModal(false);
  };

  const updateTiming = (key, value) => {
    setAnimationTiming((prev) => ({
      ...prev,
      [key]: value === "" ? "" : value,
    }));
  };

  const resetTiming = () => setAnimationTiming({ ...DEFAULT_TIMING_STR });

  const sanitizeTimingValue = (value, fallback) => {
    const num = parseFloat(value);
    if (Number.isFinite(num) && num >= 0) return num;
    return fallback;
  };

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

    const timingConfig = {
      initialDelay: sanitizeTimingValue(
        animationTiming.initialDelay,
        DEFAULT_TIMING.initialDelay,
      ),
      lineSlideIn: sanitizeTimingValue(
        animationTiming.lineSlideIn,
        DEFAULT_TIMING.lineSlideIn,
      ),
      pauseBetweenGroups: sanitizeTimingValue(
        animationTiming.pauseBetweenGroups,
        DEFAULT_TIMING.pauseBetweenGroups,
      ),
      finalPause: sanitizeTimingValue(
        animationTiming.finalPause,
        DEFAULT_TIMING.finalPause,
      ),
    };

    // Create configuration data
    const config = {
      scriptPath: fileName,
      startLine,
      endLine,
      includeComments,
      orientation,
      quality,
      lineGroups: lineGroups.map((group) => {
        if (group === "ALL_REMAINING") return "ALL_REMAINING";
        if (typeof group === "object" && group.type === "SPLIT")
          return `SPLIT ${group.line}`;
        return group.join(" ");
      }),
      syntaxColors,
      animationTiming: timingConfig,
    };

    // Create FormData to send file and config
    const formData = new FormData();
    formData.append("file", file);
    formData.append("config", JSON.stringify(config));

    try {
      // Show loading modal
      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingStatus("starting");

      // Send request to backend
      const response = await fetch(`${API_URL}/api/animate`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to generate animation");
      }

      // Start polling for progress
      const taskId = result.taskId;
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(
            `${API_URL}/api/progress/${taskId}`,
          );
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setLoadingProgress(progressData.progress);
            setLoadingStatus(progressData.status || "processing");

            // Stop polling when complete
            if (
              progressData.status === "complete" ||
              progressData.progress >= 100
            ) {
              clearInterval(progressInterval);
            }
          }
        } catch (err) {
          console.error("Progress polling error:", err);
        }
      }, 500);

      // Wait for completion
      await new Promise((resolve) => {
        const checkComplete = setInterval(async () => {
          try {
            const progressResponse = await fetch(
              `${API_URL}/api/progress/${taskId}`,
            );
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (
                progressData.status === "complete" ||
                progressData.progress >= 100
              ) {
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

      // Store video URLs - stream for preview, download for saving
      const streamUrl = `${API_URL}/api/stream/${result.videoId}`;
      const downloadUrl = `${API_URL}/api/download/${result.videoId}`;
      setCompletedVideoUrl(streamUrl);
      setCompletedVideoFilename(result.filename);
      // Store download URL separately for the download button
      window._videoDownloadUrl = downloadUrl;

      // Hide loading modal and show upload another modal with video preview
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

  const getPreviewLines = () => {
    if (!fileContent) return [];
    return fileContent.split("\n");
  };

  // Get file extension for syntax highlighting
  const fileExtension = fileName ? "." + fileName.split(".").pop() : "";

  // Memoize the syntax-highlighted lines for the preview modal
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
    const map = new Map();
    const addToMap = (lineNum, groupNum) => {
      const existing = map.get(lineNum) || [];
      if (!existing.includes(groupNum)) {
        map.set(lineNum, [...existing, groupNum]);
      }
    };

    // Track which lines are consumed by ALL_REMAINING to keep semantics consistent
    const consumed = new Set();

    lineGroups.forEach((group, idx) => {
      const groupNum = idx + 1;
      if (group === "ALL_REMAINING") {
        for (let ln = startLine; ln <= endLine; ln++) {
          if (!consumed.has(ln)) {
            addToMap(ln, groupNum);
            consumed.add(ln);
          }
        }
      } else if (typeof group === "object" && group.type === "SPLIT") {
        const ln = group.line;
        if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
          addToMap(ln, groupNum);
          consumed.add(ln);
        }
      } else if (Array.isArray(group)) {
        group.forEach((ln) => {
          if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
            addToMap(ln, groupNum);
            consumed.add(ln);
          }
        });
      }
    });

    return map;
  }, [lineGroups, startLine, endLine]);

  const isLineInRange = (lineNum) => {
    return lineNum >= startLine && lineNum <= endLine;
  };

  const isLineInGroup = (lineNum) => {
    return shownLines.has(lineNum);
  };

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

          {/* API Status Banner */}
          <AnimatePresence>
            {apiStatus !== "awake" && (
              <motion.div
                className={`api-status-banner ${apiStatus}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                {apiStatus === "checking" && (
                  <>
                    <span className="status-spinner"></span>
                    <span>Connecting to server...</span>
                  </>
                )}
                {apiStatus === "waking" && (
                  <>
                    <span className="status-spinner"></span>
                    <span>
                      Server is waking up... (this may take up to a minute)
                    </span>
                  </>
                )}
                {apiStatus === "error" && (
                  <>
                    <span>Server unavailable. </span>
                    <button
                      type="button"
                      onClick={checkApiStatus}
                      className="retry-btn"
                    >
                      Retry
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
                  {fileName || "Choose a file..."}
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
                    File loaded: {totalLines} lines total
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
                          onChange={(e) =>
                            setStartLine(parseInt(e.target.value))
                          }
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

                  {/* Syntax Highlighting Colors */}
                  <motion.div
                    className="form-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                  >
                    <h2>4. Syntax Highlighting Colors</h2>
                    <p className="help-text">
                      Customize the colors used for syntax highlighting in the
                      animation.
                    </p>
                    <div className="color-preview-row">
                      {Object.entries(syntaxColors).map(([key, color]) => (
                        <div
                          key={key}
                          className="color-preview-chip"
                          style={{ backgroundColor: color }}
                        >
                          <span className="color-preview-label">{key}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowColorModal(true)}
                      className="btn-colors"
                    >
                      Customize Colors
                    </button>
                  </motion.div>

                  {/* Video Orientation */}
                  <motion.div
                    className="form-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.28 }}
                  >
                    <h2>5. Video Orientation</h2>
                    <p className="help-text">
                      Choose the aspect ratio for your video output.
                    </p>
                    <div className="orientation-toggle">
                      <button
                        type="button"
                        className={`orientation-btn ${orientation === "landscape" ? "active" : ""}`}
                        onClick={() => setOrientation("landscape")}
                      >
                        <span className="orientation-icon landscape-icon"></span>
                        <span className="orientation-label">Landscape</span>
                        <span className="orientation-size">1920×1080</span>
                      </button>
                      <button
                        type="button"
                        className={`orientation-btn ${orientation === "portrait" ? "active" : ""}`}
                        onClick={() => setOrientation("portrait")}
                      >
                        <span className="orientation-icon portrait-icon"></span>
                        <span className="orientation-label">Portrait</span>
                        <span className="orientation-size">1080×1920</span>
                      </button>
                    </div>
                  </motion.div>

                  {/* Quality Preset */}
                  <motion.div
                    className="form-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.29 }}
                  >
                    <h2>6. Quality Preset</h2>
                    <p className="help-text">
                      Choose rendering quality. Lower quality renders faster.
                    </p>
                    <div className="quality-toggle">
                      <button
                        type="button"
                        className={`quality-btn ${quality === "fast" ? "active" : ""}`}
                        onClick={() => setQuality("fast")}
                      >
                        <span className="quality-label">Fast</span>
                        <span className="quality-size">480p @ 60fps</span>
                      </button>
                      <button
                        type="button"
                        className={`quality-btn ${quality === "standard" ? "active" : ""}`}
                        onClick={() => setQuality("standard")}
                      >
                        <span className="quality-label">Standard</span>
                        <span className="quality-size">720p @ 60fps</span>
                      </button>
                      <button
                        type="button"
                        className={`quality-btn ${quality === "high" ? "active" : ""}`}
                        onClick={() => setQuality("high")}
                      >
                        <span className="quality-label">High</span>
                        <span className="quality-size">1080p @ 60fps</span>
                      </button>
                    </div>
                  </motion.div>

                  {/* Animation Timing */}
                  <motion.div
                    className="form-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <h2>7. Animation Timing</h2>
                    <p className="help-text">
                      Fine-tune how long each part of the animation lasts
                      (seconds).
                    </p>
                    <div className="timing-inputs-grid">
                      <div className="timing-input-group">
                        <label htmlFor="initial-delay">Initial delay</label>
                        <input
                          type="number"
                          id="initial-delay"
                          min="0"
                          step="0.1"
                          value={animationTiming.initialDelay}
                          onChange={(e) =>
                            updateTiming("initialDelay", e.target.value)
                          }
                        />
                        <span className="input-suffix">sec</span>
                      </div>

                      <div className="timing-input-group">
                        <label htmlFor="line-slide">Line slide-in</label>
                        <input
                          type="number"
                          id="line-slide"
                          min="0"
                          step="0.1"
                          value={animationTiming.lineSlideIn}
                          onChange={(e) =>
                            updateTiming("lineSlideIn", e.target.value)
                          }
                        />
                        <span className="input-suffix">sec</span>
                      </div>

                      <div className="timing-input-group">
                        <label htmlFor="group-pause">
                          Pause between groups
                        </label>
                        <input
                          type="number"
                          id="group-pause"
                          min="0"
                          step="0.1"
                          value={animationTiming.pauseBetweenGroups}
                          onChange={(e) =>
                            updateTiming("pauseBetweenGroups", e.target.value)
                          }
                        />
                        <span className="input-suffix">sec</span>
                      </div>

                      <div className="timing-input-group">
                        <label htmlFor="final-pause">Final pause</label>
                        <input
                          type="number"
                          id="final-pause"
                          min="0"
                          step="0.1"
                          value={animationTiming.finalPause}
                          onChange={(e) =>
                            updateTiming("finalPause", e.target.value)
                          }
                        />
                        <span className="input-suffix">sec</span>
                      </div>
                    </div>
                    <div className="timing-actions">
                      <button
                        type="button"
                        className="btn-reset"
                        onClick={resetTiming}
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </motion.div>

                  {/* Line Groups */}
                  <motion.div
                    className="form-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <h2>8. Define Line Groups</h2>
                    <p className="help-text">
                      Enter line numbers for each animation group
                      (space-separated). Leave empty and click "Add Group" to
                      show all remaining lines.
                    </p>
                    <p className="help-text example">
                      Example: 21 38 34 or 1-5 15-23 9-13
                    </p>

                    <div className="line-group-input">
                      <input
                        type="text"
                        placeholder="e.g., 1 2 3 or leave empty for all remaining"
                        value={currentGroup}
                        onChange={(e) => setCurrentGroup(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addLineGroup();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addLineGroup}
                        className="btn-add"
                      >
                        Add Group
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSplitModal(true)}
                        className="btn-split"
                      >
                        Split
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
                          <div className="groups-header">
                            <h3>Animation Groups:</h3>
                            <button
                              type="button"
                              onClick={clearAllGroups}
                              className="btn-clear-all"
                            >
                              Clear All
                            </button>
                          </div>
                          <AnimatePresence mode="popLayout">
                            {lineGroups.map((group, index) => (
                              <motion.div
                                key={index}
                                className="line-group-item"
                                initial={{ opacity: 0, x: -20, scale: 0.8 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                                transition={{
                                  duration: 0.3,
                                  type: "spring",
                                  stiffness: 200,
                                }}
                                layout
                              >
                                <span className="group-number">
                                  Group {index + 1}:
                                </span>
                                <span
                                  className={`group-lines ${typeof group === "object" && group.type === "SPLIT" ? "split-group" : ""}`}
                                >
                                  {group === "ALL_REMAINING"
                                    ? "All remaining lines"
                                    : typeof group === "object" &&
                                        group.type === "SPLIT"
                                      ? `SPLIT at line ${group.line}`
                                      : `Lines ${group.join(", ")}`}
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
                    className="form-section submit-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                  >
                    <button
                      type="submit"
                      className="btn-submit"
                      disabled={apiStatus !== "awake"}
                    >
                      {apiStatus !== "awake"
                        ? "Waiting for server..."
                        : "Generate Animation"}
                    </button>
                    <div className="footer-links">
                      <a
                        href="https://ko-fi.com/heyitsjhello"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="support-btn"
                      >
                        ♥ Support this project
                      </a>
                      <a
                        href="https://github.com/HeyItsJhello/CodeAnimator/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="feedback-btn"
                      >
                        ? Send Feedback
                      </a>
                    </div>
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
                <div className="preview-header-top">
                  <h2>File Preview</h2>
                  <button
                    type="button"
                    className="btn-preview-colors"
                    onClick={() => setShowPreviewModal(true)}
                  >
                    Preview Colors
                  </button>
                </div>
                <span className="preview-filename">{fileName}</span>
              </div>
              <div className="preview-content">
                <pre className="code-preview">
                  {(() => {
                    const lines = getPreviewLines();
                    const maxLineNum = lines.length;
                    const lineNumWidth = String(maxLineNum).length;
                    return lines.map((line, index) => {
                      const lineNum = index + 1;
                      const inRange = isLineInRange(lineNum);
                      const inGroup = isLineInGroup(lineNum);
                      const indicatorText = lineGroupMap.get(lineNum)?.length
                        ? `G${lineGroupMap.get(lineNum).join(",")}`
                        : "";
                      const paddedLineNum = String(lineNum).padStart(
                        lineNumWidth,
                        " ",
                      );
                      return (
                        <div
                          key={index}
                          className={`code-line ${inRange ? "in-range" : ""} ${inGroup ? "in-group" : ""}`}
                        >
                          <span className="line-number">{paddedLineNum}</span>
                          <span className="line-content">{line || " "}</span>
                          <span className="line-group-indicator">
                            {indicatorText}
                          </span>
                        </div>
                      );
                    });
                  })()}
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
                  <div className="loading-icon">
                    <img src="/Movie.png" alt="" className="icon-sprite" />
                  </div>
                  <h3 className="loading-text">Generating Animation...</h3>
                  <p className="loading-subtext">
                    Please wait while we render your code animation
                  </p>
                  <div className="progress-bar-container">
                    <div className="progress-status">
                      {loadingStatus === "starting" && "Starting..."}
                      {loadingStatus === "generating SVGs" &&
                        "Generating text elements..."}
                      {loadingStatus === "rendering frames" &&
                        "Rendering frames..."}
                      {loadingStatus === "compiling video" &&
                        "Compiling video..."}
                      {loadingStatus === "finalizing" && "Finalizing..."}
                      {loadingStatus === "complete" && "Complete!"}
                    </div>
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

        {/* Split Modal */}
        <AnimatePresence>
          {showSplitModal && (
            <motion.div
              className="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowSplitModal(false)}
            >
              <motion.div
                className="split-modal"
                initial={{ scale: 0.8, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="split-header">
                  <span className="split-title">Add Split Point</span>
                  <button
                    className="btn-close"
                    onClick={() => setShowSplitModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="split-body">
                  <p className="split-description">
                    Where would you like to split? This will scroll the current
                    content off screen and start fresh with the specified line
                    at the top.
                  </p>
                  <div className="split-input-group">
                    <label htmlFor="split-line">
                      Start next section at line:
                    </label>
                    <input
                      type="number"
                      id="split-line"
                      min={startLine}
                      max={endLine}
                      value={splitLineInput}
                      onChange={(e) => setSplitLineInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSplit();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="split-buttons">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setShowSplitModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={addSplit}
                    >
                      Add Split
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Color Settings Modal */}
        <AnimatePresence>
          {showColorModal && (
            <motion.div
              className="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowColorModal(false)}
            >
              <motion.div
                className="color-modal"
                initial={{ scale: 0.8, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="color-modal-header">
                  <span className="color-modal-title">
                    Syntax Highlighting Colors
                  </span>
                  <button
                    className="btn-close"
                    onClick={() => setShowColorModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="color-modal-body">
                  <p className="color-modal-description">
                    Customize the colors for different code elements in your
                    animation.
                  </p>
                  <div className="color-inputs-grid">
                    {Object.entries(syntaxColors).map(([key, color]) => (
                      <div key={key} className="color-input-group">
                        <label htmlFor={`color-${key}`}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </label>
                        <div className="color-input-wrapper">
                          <input
                            type="color"
                            id={`color-${key}`}
                            value={color}
                            onChange={(e) =>
                              setSyntaxColors((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                          />
                          <input
                            type="text"
                            value={color}
                            onChange={(e) =>
                              setSyntaxColors((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="color-modal-buttons">
                    <button
                      type="button"
                      className="btn-reset"
                      onClick={() =>
                        setSyntaxColors({ ...DEFAULT_SYNTAX_COLORS })
                      }
                    >
                      Reset to Default
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => setShowColorModal(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Syntax Highlighted Preview Modal */}
        <AnimatePresence>
          {showPreviewModal && (
            <motion.div
              className="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowPreviewModal(false)}
            >
              <motion.div
                className="syntax-preview-modal"
                initial={{ scale: 0.8, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="syntax-preview-header">
                  <span className="syntax-preview-title">Color Preview</span>
                  <button
                    className="btn-close"
                    onClick={() => setShowPreviewModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="syntax-preview-body">
                  <p className="syntax-preview-description">
                    Preview of how your code will appear with the current color
                    settings.
                  </p>
                  <div className="syntax-preview-code-container">
                    <pre className="syntax-preview-code">
                      {highlightedLines
                        .filter(
                          (_, idx) =>
                            idx + 1 >= startLine && idx + 1 <= endLine,
                        )
                        .map(({ lineNum, tokens }) => (
                          <div key={lineNum} className="syntax-preview-line">
                            <span className="syntax-preview-line-num">
                              {lineNum}
                            </span>
                            <span className="syntax-preview-line-content">
                              {tokens.map((token, idx) => (
                                <span key={idx} style={{ color: token.color }}>
                                  {token.text}
                                </span>
                              ))}
                            </span>
                          </div>
                        ))}
                    </pre>
                  </div>
                  <div className="syntax-preview-legend">
                    <span className="legend-title">Legend:</span>
                    <div className="legend-items">
                      {Object.entries(syntaxColors)
                        .filter(([key]) => key !== "default")
                        .map(([key, color]) => (
                          <div key={key} className="legend-item">
                            <span
                              className="legend-color"
                              style={{ backgroundColor: color }}
                            ></span>
                            <span className="legend-label">{key}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="syntax-preview-buttons">
                    <button
                      type="button"
                      className="btn-edit-colors"
                      onClick={() => {
                        setShowPreviewModal(false);
                        setShowColorModal(true);
                      }}
                    >
                      Edit Colors
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => setShowPreviewModal(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Complete Modal with Preview */}
        <AnimatePresence>
          {showUploadAnotherModal && (
            <motion.div
              className="loading-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="upload-another-modal video-complete-modal"
                initial={{ scale: 0.8, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -50 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="upload-another-header">
                  <span className="upload-another-title">Video Complete!</span>
                </div>
                <div className="upload-another-body">
                  {completedVideoUrl && (
                    <div className="video-preview-container">
                      <video
                        src={completedVideoUrl}
                        controls
                        autoPlay
                        loop
                        className="video-preview"
                      />
                    </div>
                  )}
                  <div className="upload-another-buttons">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={handleCloseVideoModal}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={handleDownloadVideo}
                    >
                      Download Video
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={resetForNewFile}
                    >
                      Upload New File
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
