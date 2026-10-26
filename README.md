# Code Animator 🎬

Turn a source file into an animated video of its code appearing line by line, group by group.

Originally built for Godot / Xogot showcases: editing in line after line of code by hand got tedious, so this does it for you.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Remotion](https://img.shields.io/badge/Remotion-0B84F3?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

Try it at https://codemation.dev/

https://github.com/user-attachments/assets/ed7b0d6c-e840-499b-a7b9-a5f8b1194bd0

## Features

- Upload a code file (Python, JavaScript/TypeScript, C/C++, Java, Go, Rust, GDScript, and more) with a live preview
- Pick a line range and group lines to appear together
- Toggle comments, customize syntax colors, choose from 14 monospace fonts
- Animations: slide in, fade in, typewriter, drop in, scale in
- Landscape or portrait; 720p30, 1080p60, or 4K60
- Dry run to check timing before rendering
- Uploads are deleted immediately; videos are deleted once downloaded, and anything left over (abandoned or failed renders) is swept after 30 minutes

## Running locally

Requires Node.js 20.19+.

```bash
git clone https://github.com/HeyItsJhello/CodeAnimator.git
cd CodeAnimator

(cd renderer && npm install)       # Remotion composition, bundled by the backend
(cd backend-node && npm install && npm start)   # API on http://localhost:8000
(cd frontend && npm install && npm run dev)     # UI on http://localhost:5173
```

The frontend reads the API URL from `VITE_API_URL` (default `http://localhost:8000`).

Tests: `npm test` in `backend-node/` and `renderer/`.

## Line groups

Each group is revealed together; groups play in order.

- `3 5-7` shows lines 3, 5, 6, 7
- An empty group shows every remaining line in the range
- **Split** starts a new group at a single line

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `POST` | `/api/validate` | Validate `file` + `config` (multipart) |
| `POST` | `/api/dry-run` | Frame counts and duration, no render |
| `POST` | `/api/animate` | Start a render; returns `taskId` |
| `GET` | `/api/progress-stream/:taskId` | Server-sent progress events |
| `GET` | `/api/stream/:videoId` | Stream the finished video |
| `GET` | `/api/download/:videoId` | Download (then delete) the video |

## Project structure

```
backend-node/   server.js: HTTP API + rendering; config.js: pure request logic (tested)
renderer/       Remotion composition: layout, timing, syntax highlighting
frontend/       React + Vite web app
TestingScripts/ Sample source files for trying the app
```

## License

MIT, see [LICENSE](LICENSE).
