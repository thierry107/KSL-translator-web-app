# SignBridge AI — Real-Time In-Browser Sign Language Translator

**SignBridge AI** is a high-performance web application designed to translate hand sign gestures into spoken language and text captions in real time, directly in the browser. Powered by MediaPipe Vision Wasm landmark detection and an extensible translation engine architecture, SignBridge AI enables fast, accessible, and privacy-preserving communication.

---

## 🌟 Key Features

- **Real-Time 3D Landmark Tracking**: Utilizes Google MediaPipe Vision Wasm (`@mediapipe/tasks-vision`) to extract 21 3D hand keypoints per hand at up to 60 FPS in-browser.
- **Dual Translation Engine Architecture**:
  - **Mock Engine (Local)**: Rotation-independent heuristic gesture classifier for offline and client-side demonstration (`HELLO`, `YES`, `PEACE`, `THANK YOU`).
  - **FastAPI WebSocket Backend (Remote)**: Stream keypoints to a Python FastAPI backend hosting ONNX sequence models for deep learning inference.
- **Privacy Guard Guarantee**: Video frames never leave your local device. In remote mode, only normalized numeric 3D landmark coordinate arrays are sent to the backend.
- **Accessibility & Speech Synthesis**: High-contrast UI, full ARIA live region support (`aria-live="polite"`), and built-in Web Speech API Text-to-Speech (TTS).
- **Developer Inspection Suite (`?debug=1`)**: Unlock real-time telemetry panels, MediaPipe Wasm inspectors, skeleton overlays, and camera hardware diagnostic suites.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React, `@mediapipe/tasks-vision`
- **Backend**: Python 3.10+, FastAPI, WebSockets, ONNX Runtime (`onnxruntime`), NumPy, Pydantic
- **Deployment**: GitHub Pages via GitHub Actions (Vite base `/KSL-translator-web-app/`), Render (FastAPI WebSocket Service)

---

## 🚀 Quick Start Guide

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ and `npm`
- [Python](https://www.python.org/) 3.10+ (for optional backend server)

---

### 1. Running the Frontend

Clone the repository and install dependencies:

```bash
git clone https://github.com/thierry107/KSL-translator-web-app.git
cd KSL-translator-web-app
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

#### Building for Production

```bash
npm run build
```

The production output will be generated in `dist/`.

---

### 2. Running the FastAPI Backend (Optional)

Navigate to the `backend/` directory:

```bash
cd backend
pip install -r requirements.txt
```

Start the FastAPI WebSocket server with Uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The WebSocket endpoint will be active at `ws://localhost:8000/api/v1/translate/ws`.

---

## ⚡ Translation Provider Modes

1. **Mock Mode (Local Heuristic)**:
   - Evaluates hand landmark geometry locally inside the browser.
   - Uses rotation-independent Euclidean distance comparisons (fingertip-to-wrist vs. PIP-to-wrist) for robust gesture detection regardless of hand orientation.
   - Includes simulated demo triggers for presentation and offline testing.

2. **FastAPI WebSocket Mode (Remote Backend)**:
   - Connects to the FastAPI backend via WebSockets.
   - Automatically handles cold-start delays (e.g. Render free tier 30-60s wake time) with visual "Connecting..." status indicators.
   - If no trained `classifier.onnx` file is placed in `backend/model/`, the server runs in **Placeholder Stub Mode** with a visible notification banner in the UI: *"Backend using placeholder model. Results are not real translations."*

---

## 🔍 Developer Debug Mode (`?debug=1`)

To activate the developer debug suite, append `?debug=1` to the URL:

```
http://localhost:5173/?debug=1
```

Debug mode enables:
- **Phase 3 MediaPipe Vision Inspector**: Live 60 FPS skeleton overlay toggle, real-time Wasm status, detected hand counter, and raw coordinate stream inspector.
- **Phase 2 Camera Verification Test Suite**: Hardware device enumeration, facing mode toggle tests (`user` vs `environment`), and video stream lifecycle logging.
- **Telemetry Footer**: Real-time FPS readout and build metadata.

---

## 📄 License

MIT License — free for open-source use and educational projects.
