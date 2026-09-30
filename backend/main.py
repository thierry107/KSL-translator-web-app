"""
KSL Translator — FastAPI WebSocket Backend

Endpoint: ws://<host>/api/v1/translate/ws

Protocol (mirrors src/websocket/protocol.ts):
  Client → Server:
    { type: "config",    sessionId, targetLanguage, fps }
    { type: "landmarks", sessionId, frameId, timestamp, data: { leftHand, rightHand } }
    { type: "ping",      timestamp }

  Server → Client:
    { type: "prediction", sessionId, frameId, timestamp, payload: { gloss, translatedText, confidence, isFinal } }
    { type: "pong",       timestamp }
    { type: "error",      code, message }

Run locally:
  cd backend
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from classifier import SignClassifier, landmarks_to_feature_vector
from protocol import (
    ConfigMessage,
    LandmarksMessage,
    PingMessage,
    PongMessage,
    PredictionMessage,
    PredictionPayload,
    ErrorMessage,
)
from session_buffer import SessionBuffer

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("ksl.backend")


# ── App lifecycle ─────────────────────────────────────────────────────────────

classifier: SignClassifier


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the classifier once at startup, release on shutdown."""
    global classifier
    log.info("Loading sign classifier …")
    classifier = SignClassifier()
    log.info("Classifier ready.")
    yield
    log.info("Shutting down.")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="KSL Translator Backend",
    description="WebSocket-based sign language translation API.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the Vercel frontend (and localhost dev server) to connect.
# Tighten this list before going to production if needed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "timestamp": time.time()}


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@app.websocket("/api/v1/translate/ws")
async def translate_ws(websocket: WebSocket) -> None:
    await websocket.accept()
    client_id = id(websocket)
    log.info(f"[{client_id}] Client connected.")

    # One buffer per connection; replaced on every 'config' message.
    buffer: SessionBuffer | None = None

    try:
        async for raw in websocket.iter_text():
            # ── Parse incoming message ─────────────────────────────────────
            try:
                msg = json.loads(raw)
                msg_type: str = msg.get("type", "")
            except json.JSONDecodeError:
                await _send_error(websocket, "PARSE_ERROR", "Invalid JSON payload.")
                continue

            # ── config ────────────────────────────────────────────────────
            if msg_type == "config":
                try:
                    cfg = ConfigMessage(**msg)
                except Exception as exc:
                    await _send_error(websocket, "BAD_CONFIG", str(exc))
                    continue

                buffer = SessionBuffer(
                    session_id=cfg.sessionId,
                    target_language=cfg.targetLanguage,
                    fps=cfg.fps,
                )
                log.info(
                    f"[{client_id}] New session: {cfg.sessionId} "
                    f"lang={cfg.targetLanguage} fps={cfg.fps}"
                )

            # ── landmarks ─────────────────────────────────────────────────
            elif msg_type == "landmarks":
                if buffer is None:
                    await _send_error(
                        websocket,
                        "NO_SESSION",
                        "Send a 'config' message before sending landmarks.",
                    )
                    continue

                try:
                    lm_msg = LandmarksMessage(**msg)
                except Exception as exc:
                    await _send_error(websocket, "BAD_LANDMARKS", str(exc))
                    continue

                # Validate session continuity
                if lm_msg.sessionId != buffer.session_id:
                    await _send_error(
                        websocket,
                        "SESSION_MISMATCH",
                        f"Expected sessionId={buffer.session_id}, got {lm_msg.sessionId}.",
                    )
                    continue

                # Convert landmark objects to flat feature vector and buffer
                left = [lm.model_dump() for lm in lm_msg.data.leftHand]
                right = [lm.model_dump() for lm in lm_msg.data.rightHand]
                feature_vec = landmarks_to_feature_vector(left, right)
                buffer.push_frame(feature_vec)

                # Run inference when enough frames are buffered
                if buffer.should_infer():
                    window = buffer.get_window()
                    gloss, sentence, confidence = classifier.predict(window)
                    buffer.mark_inferred()

                    prediction = PredictionMessage(
                        sessionId=buffer.session_id,
                        frameId=lm_msg.frameId,
                        timestamp=time.time() * 1000,  # ms, like the client
                        payload=PredictionPayload(
                            gloss=gloss,
                            translatedText=sentence,
                            confidence=confidence,
                            isStub=getattr(classifier, 'is_stub', False),
                        ),
                    )
                    await websocket.send_text(prediction.model_dump_json())
                    log.info(
                        f"[{client_id}] Prediction → {gloss!r} "
                        f"({confidence:.2%}) | frames={buffer.frame_count}"
                    )

            # ── ping ──────────────────────────────────────────────────────
            elif msg_type == "ping":
                try:
                    ping = PingMessage(**msg)
                except Exception:
                    ping = None  # type: ignore

                pong = PongMessage(timestamp=time.time() * 1000)
                await websocket.send_text(pong.model_dump_json())

            else:
                log.warning(f"[{client_id}] Unknown message type: {msg_type!r}")

    except WebSocketDisconnect:
        log.info(f"[{client_id}] Client disconnected.")
    except Exception as exc:
        log.exception(f"[{client_id}] Unexpected error: {exc}")
        try:
            await _send_error(websocket, "INTERNAL_ERROR", "An unexpected server error occurred.")
        except Exception:
            pass


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _send_error(ws: WebSocket, code: str, message: str) -> None:
    err = ErrorMessage(code=code, message=message)
    try:
        await ws.send_text(err.model_dump_json())
    except Exception:
        pass  # Connection may already be closing
