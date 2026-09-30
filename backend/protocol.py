"""
KSL Translator — WebSocket Protocol Types
Mirrors the TypeScript definitions in src/websocket/protocol.ts exactly.
"""
from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


# ── Landmark point (matches LandmarkPoint in types/index.ts) ──────────────────

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = None


# ── Client → Server messages ──────────────────────────────────────────────────

class ConfigMessage(BaseModel):
    type: Literal["config"]
    sessionId: str
    targetLanguage: str
    fps: int


class HandData(BaseModel):
    leftHand: list[LandmarkPoint]
    rightHand: list[LandmarkPoint]


class LandmarksMessage(BaseModel):
    type: Literal["landmarks"]
    sessionId: str
    frameId: int
    timestamp: float
    data: HandData


class PingMessage(BaseModel):
    type: Literal["ping"]
    timestamp: float


# ── Server → Client messages ──────────────────────────────────────────────────

class PredictionPayload(BaseModel):
    gloss: str
    translatedText: str
    confidence: float
    isFinal: bool = True
    isStub: bool = False


class PredictionMessage(BaseModel):
    type: Literal["prediction"] = "prediction"
    sessionId: str
    frameId: Optional[int] = None
    timestamp: float
    payload: PredictionPayload


class PongMessage(BaseModel):
    type: Literal["pong"] = "pong"
    timestamp: float


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str
