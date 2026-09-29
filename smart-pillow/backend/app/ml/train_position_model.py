"""
RandomForest training pipeline for sleep position classification.

Usage:
    python train_position_model.py

Output:
    app/ml/position_model.pkl
"""
from __future__ import annotations
import os
import sys
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder

# ---------------------------------------------------------------------------
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "position_training_data.csv")
if not os.path.exists(DATA_PATH):
    DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "position_training_data.csv")
MODEL_DIR = os.path.join(os.path.dirname(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "position_model.pkl")

FSR_MAX = 4095.0
LEFT_COLS = [0, 3, 6]
CENTER_COLS = [1, 4, 7]
RIGHT_COLS = [2, 5, 8]
TOP_ROWS = [0, 1, 2]
MID_ROWS = [3, 4, 5]
BOT_ROWS = [6, 7, 8]


def build_features(fsr_row: np.ndarray) -> np.ndarray:
    """Extract 28 features from a 9-element FSR reading."""
    arr = fsr_row.astype(float)
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
    return np.concatenate([arr, norm, [left, center, right, top, mid, bot, cx, cy, total, var]])


def load_data(path: str):
    df = pd.read_csv(path)
    fsr_cols = [f"fsr{i}" for i in range(1, 10)]
    X_raw = df[fsr_cols].values
    y = df["label"].values

    X = np.array([build_features(row) for row in X_raw])
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    return X, y_enc, le


def train(data_path: str = DATA_PATH, model_path: str = MODEL_PATH):
    print(f"Loading data from: {data_path}")
    X, y, le = load_data(data_path)
    print(f"  Samples: {len(X)}, Classes: {le.classes_}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)

    # Evaluation
    y_pred = clf.predict(X_test)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    cv_scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
    print(f"5-fold CV accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # Save
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(clf, model_path)
    print(f"\nModel saved to: {model_path}")
    return clf, le


if __name__ == "__main__":
    data = DATA_PATH
    if len(sys.argv) > 1:
        data = sys.argv[1]
    train(data_path=data)
