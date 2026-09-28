"""
KSL Translator — Session Buffer
Maintains a per-connection sliding window of landmark frames for sequence inference.
"""
from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque


# Minimum number of frames required before running inference.
# Below this threshold the buffer silently discards the frame.
MIN_FRAMES_FOR_INFERENCE: int = 15

# Maximum frames kept in the sliding window (matches classifier WINDOW_SIZE).
MAX_WINDOW_SIZE: int = 30

# Minimum gap between consecutive inferences (seconds).
# Prevents flooding the client with rapid-fire predictions.
INFERENCE_COOLDOWN_S: float = 1.0


@dataclass
class SessionBuffer:
    """
    Sliding window buffer for a single WebSocket session.

    Attributes:
        session_id:      Unique identifier for the translation session.
        target_language: BCP-47 language tag (e.g. "en-US").
        fps:             Frames-per-second reported by the client.
    """
    session_id: str
    target_language: str = "en-US"
    fps: int = 25

    _frames: Deque[list[float]] = field(
        default_factory=lambda: deque(maxlen=MAX_WINDOW_SIZE), init=False
    )
    _last_inference_time: float = field(default=0.0, init=False)
    _total_frames_received: int = field(default=0, init=False)

    # ── Public API ────────────────────────────────────────────────────────────

    def push_frame(self, feature_vector: list[float]) -> None:
        """Append one frame's feature vector to the sliding window."""
        self._frames.append(feature_vector)
        self._total_frames_received += 1

    def should_infer(self) -> bool:
        """
        Returns True when there is enough data and enough time has passed
        since the last inference to warrant running the classifier.
        """
        if len(self._frames) < MIN_FRAMES_FOR_INFERENCE:
            return False
        now = time.monotonic()
        if now - self._last_inference_time < INFERENCE_COOLDOWN_S:
            return False
        return True

    def get_window(self) -> list[list[float]]:
        """Return a snapshot of the current sliding window (oldest → newest)."""
        return list(self._frames)

    def mark_inferred(self) -> None:
        """Call after every inference to reset the cooldown timer."""
        self._last_inference_time = time.monotonic()

    def reset(self) -> None:
        """Clear all buffered frames and reset timing (new session)."""
        self._frames.clear()
        self._last_inference_time = 0.0
        self._total_frames_received = 0

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def frame_count(self) -> int:
        return len(self._frames)

    @property
    def total_frames_received(self) -> int:
        return self._total_frames_received
