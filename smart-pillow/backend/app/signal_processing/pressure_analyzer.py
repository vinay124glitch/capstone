"""
Pressure sensor analytics and position classification.

FSR physical layout (3x3 grid):
  FSR0  FSR1  FSR2
  FSR3  FSR4  FSR5
  FSR6  FSR7  FSR8

Columns: 0,3,6 → Left | 1,4,7 → Center | 2,5,8 → Right
Rows:    0,1,2 → Top  | 3,4,5 → Middle | 6,7,8 → Bottom
"""
from __future__ import annotations
import numpy as np
from collections import deque
from typing import List, Dict, Deque, Optional

from app.schemas.schemas import PressureMetrics, PositionResult

# FSR index mapping
LEFT_COLS = [0, 3, 6]
CENTER_COLS = [1, 4, 7]
RIGHT_COLS = [2, 5, 8]
TOP_ROWS = [0, 1, 2]
MID_ROWS = [3, 4, 5]
BOT_ROWS = [6, 7, 8]

FSR_MAX = 4095.0


def compute_pressure_metrics(fsr: List[float],
                              history: Optional[Deque] = None) -> PressureMetrics:
    arr = np.array(fsr, dtype=float)
    total = float(np.sum(arr))

    left_sum = float(np.sum(arr[LEFT_COLS]))
    center_sum = float(np.sum(arr[CENTER_COLS]))
    right_sum = float(np.sum(arr[RIGHT_COLS]))
    top_sum = float(np.sum(arr[TOP_ROWS]))
    mid_sum = float(np.sum(arr[MID_ROWS]))
    bot_sum = float(np.sum(arr[BOT_ROWS]))

    # Center of pressure (weighted average of column/row positions)
    if total > 0:
        col_positions = np.array([0, 1, 2, 0, 1, 2, 0, 1, 2], dtype=float)
        row_positions = np.array([0, 0, 0, 1, 1, 1, 2, 2, 2], dtype=float)
        cx = float(np.sum(arr * col_positions) / total) / 2.0  # normalise to 0-1
        cy = float(np.sum(arr * row_positions) / total) / 2.0
    else:
        cx, cy = 0.5, 0.5

    # Balance: how symmetrical left vs right (0.5 = perfect)
    if total > 0:
        balance = float(left_sum / (left_sum + right_sum + 1e-6))
    else:
        balance = 0.5

    # Stability: based on rolling change rate
    if history is not None and len(history) >= 2:
        prev = np.array(history[-2], dtype=float)
        curr = arr
        change = float(np.mean(np.abs(curr - prev)) / (FSR_MAX + 1e-6))
        stability = float(np.clip(100.0 * (1.0 - change * 10), 0, 100))
    else:
        stability = 100.0

    return PressureMetrics(
        fsr=fsr,
        total=total,
        left_sum=left_sum,
        center_sum=center_sum,
        right_sum=right_sum,
        top_sum=top_sum,
        middle_sum=mid_sum,
        bottom_sum=bot_sum,
        center_x=cx,
        center_y=cy,
        balance=balance,
        stability=stability,
    )


# ---------------------------------------------------------------------------
# Rule-based position classifier
# ---------------------------------------------------------------------------
class RuleBasedClassifier:
    """
    Determines sleep position from 3x3 FSR matrix.
    Thresholds are configurable via update_thresholds().
    """
    def __init__(self, threshold: float = 0.2):
        self.threshold = threshold  # minimum pressure fraction to consider a region "active"

    def update_thresholds(self, threshold: float):
        self.threshold = threshold

    def predict(self, fsr: List[float]) -> PositionResult:
        arr = np.array(fsr, dtype=float)
        total = float(np.sum(arr))

        if total < FSR_MAX * 0.5:  # too little total pressure → unknown
            return PositionResult(position="Unknown", confidence=0.0, classifier_type="rule_based")

        left_sum = float(np.sum(arr[LEFT_COLS]))
        center_sum = float(np.sum(arr[CENTER_COLS]))
        right_sum = float(np.sum(arr[RIGHT_COLS]))

        left_frac = left_sum / (total + 1e-6)
        right_frac = right_sum / (total + 1e-6)
        center_frac = center_sum / (total + 1e-6)

        th = self.threshold

        if left_frac > 0.45 and left_frac > right_frac + th:
            return PositionResult(
                position="Left", confidence=float(np.clip(left_frac, 0, 1)),
                classifier_type="rule_based"
            )
        elif right_frac > 0.45 and right_frac > left_frac + th:
            return PositionResult(
                position="Right", confidence=float(np.clip(right_frac, 0, 1)),
                classifier_type="rule_based"
            )
        elif center_frac > 0.40 and abs(left_frac - right_frac) < 0.15:
            return PositionResult(
                position="Back", confidence=float(np.clip(center_frac, 0, 1)),
                classifier_type="rule_based"
            )
        else:
            # Dominant side wins
            if left_frac >= right_frac:
                conf = float(np.clip(left_frac - right_frac, 0, 1))
                return PositionResult(position="Left", confidence=conf * 0.6,
                                      classifier_type="rule_based")
            else:
                conf = float(np.clip(right_frac - left_frac, 0, 1))
                return PositionResult(position="Right", confidence=conf * 0.6,
                                      classifier_type="rule_based")


# ---------------------------------------------------------------------------
# ML-based classifier wrapper
# ---------------------------------------------------------------------------
class MLClassifier:
    def __init__(self):
        self.model = None
        self.label_map = {0: "Left", 1: "Right", 2: "Back"}
        self._loaded = False

    def load(self, model_path: str = "ml/position_model.pkl") -> bool:
        try:
            import joblib
            self.model = joblib.load(model_path)
            self._loaded = True
            return True
        except Exception:
            self._loaded = False
            return False

    def _build_features(self, fsr: List[float]) -> np.ndarray:
        arr = np.array(fsr, dtype=float)
        total = float(np.sum(arr)) + 1e-6
        norm = arr / FSR_MAX
        left = float(np.sum(arr[LEFT_COLS]))
        center = float(np.sum(arr[CENTER_COLS]))
        right = float(np.sum(arr[RIGHT_COLS]))
        top = float(np.sum(arr[TOP_ROWS]))
        mid = float(np.sum(arr[MID_ROWS]))
        bot = float(np.sum(arr[BOT_ROWS]))
        col_pos = np.array([0, 1, 2, 0, 1, 2, 0, 1, 2], dtype=float)
        row_pos = np.array([0, 0, 0, 1, 1, 1, 2, 2, 2], dtype=float)
        cx = float(np.sum(arr * col_pos) / total) / 2.0
        cy = float(np.sum(arr * row_pos) / total) / 2.0
        var = float(np.var(arr))
        features = np.concatenate([
            arr,           # 9 raw FSR values
            norm,          # 9 normalised FSR values
            [left, center, right, top, mid, bot, cx, cy, total, var]
        ])
        return features.reshape(1, -1)

    def predict(self, fsr: List[float]) -> Optional[PositionResult]:
        if not self._loaded or self.model is None:
            return None
        try:
            features = self._build_features(fsr)
            pred_idx = int(self.model.predict(features)[0])
            if hasattr(self.model, "predict_proba"):
                proba = self.model.predict_proba(features)[0]
                confidence = float(np.max(proba))
            else:
                confidence = 0.8
            label = self.label_map.get(pred_idx, "Unknown")
            return PositionResult(position=label, confidence=confidence,
                                  classifier_type="ml")
        except Exception:
            return None


# Singletons used by services
rule_classifier = RuleBasedClassifier()
ml_classifier = MLClassifier()
