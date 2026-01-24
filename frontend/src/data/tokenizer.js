// Simple syntax highlighter patterns for preview
// These patterns give a reasonable approximation of Pygments tokenization
export const getTokenPatterns = (fileExtension) => {
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
export const tokenizeLine = (line, patterns, colors) => {
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
