"""
KSL Translator — Sign Classifier
Wraps the ONNX model (or a stub when no model file is present).

Input layout per frame (126 floats):
  [left_hand_x0, left_hand_y0, left_hand_z0, ..., left_hand_x20, left_hand_y20, left_hand_z20,   # 63
   right_hand_x0, right_hand_y0, right_hand_z0, ..., right_hand_x20, right_hand_y20, right_hand_z20]  # 63

A session sequence is a (T, 126) float32 array where T = number of buffered frames.
The classifier expects a fixed-length window; frames are zero-padded if T < WINDOW_SIZE.

To swap in a real model:
  1. Download your ONNX file and place it at backend/model/classifier.onnx
  2. Verify the input shape matches (batch=1, seq=WINDOW_SIZE, features=126)
  3. Update CLASS_LABELS with your model's vocabulary

Recommended pretrained starting point (ONNX, MediaPipe keypoints, edge-optimised):
  https://huggingface.co/gyann/edge-sign-ksl-mediapipe
"""
from __future__ import annotations

import os
import time
import numpy as np
from pathlib import Path

# Optional ONNX dependency — fall back to stub if not installed or no model file
try:
    import onnxruntime as ort
    _ORT_AVAILABLE = True
except ImportError:
    _ORT_AVAILABLE = False

# ── Configuration ─────────────────────────────────────────────────────────────

WINDOW_SIZE: int = 30          # Frames per inference window
FEATURE_DIM: int = 126         # 21 landmarks × 3 coords × 2 hands
MODEL_PATH: Path = Path(__file__).parent / "model" / "classifier.onnx"

# ── Vocabulary ────────────────────────────────────────────────────────────────
# Replace with the full label list from your trained model.
# This starter set covers common signs for demo purposes.
CLASS_LABELS: list[str] = [
    "HELLO", "THANK YOU", "PLEASE", "SORRY", "YES", "NO",
    "HELP", "GOOD", "BAD", "NAME", "WHAT", "WHERE",
    "WHO", "HOW", "UNDERSTAND", "AGAIN", "STOP", "GO",
    "COME", "EAT", "DRINK", "WATER", "MORE", "FINISHED",
    "I", "YOU", "WE", "FAMILY", "FRIEND", "LOVE",
]

# Simple gloss → English sentence mapping for demo readability
GLOSS_TO_SENTENCE: dict[str, str] = {
    "HELLO": "Hello!",
    "THANK YOU": "Thank you.",
    "PLEASE": "Please.",
    "SORRY": "I'm sorry.",
    "YES": "Yes.",
    "NO": "No.",
    "HELP": "Can you help me?",
    "GOOD": "That's good.",
    "BAD": "That's bad.",
    "NAME": "What is your name?",
    "WHAT": "What?",
    "WHERE": "Where?",
    "WHO": "Who?",
    "HOW": "How?",
    "UNDERSTAND": "I understand.",
    "AGAIN": "Please say that again.",
    "STOP": "Stop.",
    "GO": "Let's go.",
    "COME": "Come here.",
    "EAT": "Let's eat.",
    "DRINK": "I want to drink.",
    "WATER": "Water, please.",
    "MORE": "More, please.",
    "FINISHED": "I'm done.",
    "I": "I / Me.",
    "YOU": "You.",
    "WE": "We / Us.",
    "FAMILY": "Family.",
    "FRIEND": "Friend.",
    "LOVE": "I love you.",
}


# ── Classifier ────────────────────────────────────────────────────────────────

class SignClassifier:
    """
    Wraps an ONNX sequence classifier.

    If no model file is present, falls back to a deterministic stub that
    cycles through CLASS_LABELS — useful for UI development and demos.
    """

    def __init__(self) -> None:
        self._session: "ort.InferenceSession | None" = None
        self._stub_index: int = 0

        if _ORT_AVAILABLE and MODEL_PATH.exists():
            print(f"[Classifier] Loading ONNX model from {MODEL_PATH}")
            opts = ort.SessionOptions()
            opts.inter_op_num_threads = 2
            opts.intra_op_num_threads = 2
            self._session = ort.InferenceSession(
                str(MODEL_PATH),
                sess_options=opts,
                providers=["CPUExecutionProvider"],
            )
            self._input_name: str = self._session.get_inputs()[0].name
            self.is_stub: bool = False
            print(f"[Classifier] Model loaded — {len(CLASS_LABELS)} classes, "
                  f"input '{self._input_name}'")
        else:
            self.is_stub: bool = True
            reason = "onnxruntime not installed" if not _ORT_AVAILABLE else f"no model at {MODEL_PATH}"
            print(f"[Classifier] ⚠️  Running in STUB mode ({reason}). "
                  "Place classifier.onnx in backend/model/ to enable real inference.")

    # ── Public API ────────────────────────────────────────────────────────────

    def predict(self, frames: list[list[float]]) -> tuple[str, str, float]:
        """
        Classify a sequence of landmark frames.

        Args:
            frames: List of up to WINDOW_SIZE feature vectors (each 126 floats).
                    Shorter sequences are zero-padded automatically.

        Returns:
            (gloss, translated_sentence, confidence)
        """
        window = self._build_window(frames)

        if self._session is not None:
            return self._infer_onnx(window)
        else:
            return self._stub_predict()

    # ── Internal ──────────────────────────────────────────────────────────────

    def _build_window(self, frames: list[list[float]]) -> np.ndarray:
        """Zero-pad or truncate to (1, WINDOW_SIZE, FEATURE_DIM) float32."""
        arr = np.zeros((WINDOW_SIZE, FEATURE_DIM), dtype=np.float32)
        usable = frames[-WINDOW_SIZE:]  # take the most recent frames
        for i, frame in enumerate(usable):
            arr[i, : len(frame)] = frame[: FEATURE_DIM]
        return arr[np.newaxis, ...]  # shape: (1, WINDOW_SIZE, FEATURE_DIM)

    def _infer_onnx(self, window: np.ndarray) -> tuple[str, str, float]:
        """Run ONNX inference and decode the top-1 prediction."""
        outputs = self._session.run(None, {self._input_name: window})

        # Assume output[0] is logits or probabilities of shape (1, num_classes)
        logits = np.array(outputs[0]).squeeze()
        probs = _softmax(logits)
        class_idx = int(np.argmax(probs))
        confidence = float(probs[class_idx])

        gloss = CLASS_LABELS[class_idx] if class_idx < len(CLASS_LABELS) else "UNKNOWN"
        sentence = GLOSS_TO_SENTENCE.get(gloss, gloss.capitalize() + ".")
        return gloss, sentence, confidence

    def _stub_predict(self) -> tuple[str, str, float]:
        """
        Deterministic round-robin stub — cycles through vocabulary every ~2 s.
        Confidence is randomised slightly so the UI confidence bar moves.
        """
        gloss = CLASS_LABELS[self._stub_index % len(CLASS_LABELS)]
        self._stub_index += 1
        confidence = float(np.random.uniform(0.72, 0.97))
        sentence = GLOSS_TO_SENTENCE.get(gloss, gloss.capitalize() + ".")
        return gloss, sentence, confidence


# ── Helpers ───────────────────────────────────────────────────────────────────

def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - np.max(x))
    return e / e.sum()


def landmarks_to_feature_vector(
    left_hand: list[dict], right_hand: list[dict]
) -> list[float]:
    """
    Flatten two 21-landmark hands into a single 126-float feature vector.
    Empty / absent hands are represented as 63 zeros (model-friendly).

    Args:
        left_hand:  List of {x, y, z} dicts (21 items or empty).
        right_hand: List of {x, y, z} dicts (21 items or empty).
    """
    def hand_to_floats(landmarks: list[dict]) -> list[float]:
        if not landmarks:
            return [0.0] * 63
        result: list[float] = []
        for lm in landmarks[:21]:
            result.extend([
                float(lm.get("x", 0.0)),
                float(lm.get("y", 0.0)),
                float(lm.get("z", 0.0)),
            ])
        # Pad if fewer than 21 landmarks received
        result.extend([0.0] * max(0, 63 - len(result)))
        return result

    return hand_to_floats(left_hand) + hand_to_floats(right_hand)
