import { Prism } from './prism.js';
// Languages prism-react-renderer doesn't bundle (php needs markup-templating).
import 'prismjs/components/prism-java.js';
import 'prismjs/components/prism-csharp.js';
import 'prismjs/components/prism-ruby.js';
import 'prismjs/components/prism-markup-templating.js';
import 'prismjs/components/prism-php.js';
import 'prismjs/components/prism-bash.js';

Prism.languages.gdscript = {
  comment:      { pattern: /#.*/, greedy: true },
  string:       { pattern: /"""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/, greedy: true },
  decorator:    { pattern: /@\w+/, alias: 'decorator' },
  node_path:    { pattern: /(?:\$|%)\w[\w/]*/, alias: 'builtin_type' },
  keyword:      /\b(?:if|elif|else|for|while|match|when|func|class|class_name|var|const|enum|return|pass|break|continue|extends|signal|static|null|true|false|self|and|or|not|in|is|as|await|super|void|INF|NAN|PI|TAU)\b/,
  builtin_type: /\b(?:int|float|String|bool|Variant|Vector2|Vector2i|Vector3|Vector3i|Vector4|Vector4i|Color|Rect2|Rect2i|Transform2D|Transform3D|Basis|Quaternion|Plane|AABB|Array|Dictionary|Callable|Signal|Object|Node|Node2D|Node3D|Control|CanvasItem|CanvasLayer|Sprite2D|AnimatedSprite2D|AnimationPlayer|AnimationTree|RigidBody2D|RigidBody3D|CharacterBody2D|CharacterBody3D|Area2D|Area3D|CollisionShape2D|CollisionShape3D|Camera2D|Camera3D|Label|Button|LineEdit|TextEdit|HBoxContainer|VBoxContainer|MarginContainer|PanelContainer|ScrollContainer|TabContainer|GridContainer|NinePatchRect|TextureRect|ColorRect|SubViewport|SubViewportContainer|AudioStreamPlayer|AudioStreamPlayer2D|AudioStreamPlayer3D|Timer|HTTPRequest|FileAccess|DirAccess|JSON|PackedScene|Resource|RefCounted|WeakRef|RegEx|Tween|SceneTree|Window|OS|Engine|Input|InputEvent|InputEventKey|InputEventMouseButton|InputEventMouseMotion|Texture2D|ImageTexture|AtlasTexture|StyleBox|StyleBoxFlat|Font|ProjectSettings|ResourceLoader|PackedByteArray|PackedInt32Array|PackedInt64Array|PackedFloat32Array|PackedFloat64Array|PackedStringArray|PackedVector2Array|PackedVector3Array|PackedColorArray)\b/,
  function:     /\b\w+(?=\s*\()/,
  number:       /\b(?:0x[\da-fA-F]+|0b[01]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b/,
  operator:     /[-+*/%=<>!&|^~]+/,
  punctuation:  /[{}[\]();,.:]/,
};

const PRISM_TO_KEY = {
  keyword:           'keywords',
  'class-name':      'types',
  builtin_type:      'types',
  builtin:           'types',
  function:          'functions',
  string:            'strings',
  'template-string': 'strings',
  number:            'numbers',
  comment:           'comments',
  decorator:         'decorators',
  node_path:         'types',
};

const DEFAULTS = {
  keywords:   '#FF3D3D',
  types:      '#00FF9B',
  functions:  '#00ECFF',
  strings:    '#FFE040',
  numbers:    '#80FFE8',
  comments:   '#8899A6',
  decorators: '#FF3D3D',
  default:    '#E8E8E8',
};

export function resolveColor(types, userColors) {
  const colors = { ...DEFAULTS, ...userColors };
  for (const t of types) {
    const key = PRISM_TO_KEY[t];
    if (key && colors[key]) return colors[key];
  }
  return colors.default;
}
