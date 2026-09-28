Place your ONNX classifier file here as:

    backend/model/classifier.onnx

──────────────────────────────────────────────────────────────────────────────
RECOMMENDED PRETRAINED MODEL (works out of the box with this backend):
──────────────────────────────────────────────────────────────────────────────

  gyann/edge-sign-ksl-mediapipe (HuggingFace)
  https://huggingface.co/gyann/edge-sign-ksl-mediapipe

  → ONNX, MediaPipe hand keypoints, optimised for edge/real-time use.
  → Download the .onnx file and rename it to classifier.onnx

ALTERNATIVE (ASL, PyTorch → export to ONNX):
  namratha2412/asl-recognition
  https://huggingface.co/namratha2412/asl-recognition

──────────────────────────────────────────────────────────────────────────────
EXPECTED INPUT SHAPE:
──────────────────────────────────────────────────────────────────────────────

  (batch=1, seq=30, features=126)
  dtype: float32

  126 features = 21 left-hand landmarks × 3 (x,y,z)
              + 21 right-hand landmarks × 3 (x,y,z)

  Landmarks are pre-normalised by the frontend (wrist-centred, scale-invariant).

──────────────────────────────────────────────────────────────────────────────
WITHOUT A MODEL FILE:
──────────────────────────────────────────────────────────────────────────────

  The backend runs in STUB mode — cycles through the 30-word vocabulary
  so you can develop and demo the UI without any model file.

──────────────────────────────────────────────────────────────────────────────
UPDATING THE VOCABULARY:
──────────────────────────────────────────────────────────────────────────────

  Edit CLASS_LABELS and GLOSS_TO_SENTENCE in backend/classifier.py to match
  the label list your model was trained on. Order must match the model output.
