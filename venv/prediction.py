# predict_dynamic.py

import numpy as np
import joblib
from tensorflow.keras.models import load_model # type: ignore
from sliding import create_windows

MODEL_PATH = "lstm_multivariate.h5"
SCALER_PATH = "scaler_multi.pkl"

model = load_model(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

SEQ_LEN = 5
STRIDE = 1
PROB_THRESH = 0.5


def preprocess_windows(windows):
    scaled = []
    for w in windows:
        flat = w.reshape(-1, w.shape[1])
        scaled_flat = scaler.transform(flat)
        scaled.append(scaled_flat.reshape(SEQ_LEN, w.shape[1]))
    return np.array(scaled)


def predict_dynamic_sequence(seq):
    """
    seq = list of [crate_temp, reefer_temp, humidity, location_temp, duration, crop_type]
    length = ANY (>=5)
    """

    seq = np.array(seq, dtype=float)

    # Create windows from the dynamic batch
    windows = create_windows(seq, seq_len=SEQ_LEN, stride=STRIDE)

    # Scale windows
    windows_scaled = preprocess_windows(windows)

    preds = []
    probs = []

    for w in windows_scaled:
        inp = w.reshape(1, SEQ_LEN, 6)
        p = float(model.predict(inp)[0][0])
        preds.append(1 if p >= PROB_THRESH else 0)
        probs.append(p)

    # FINAL DECISION RULE
    if max(probs) >= 0.7:
        final = "HIGH RISK"
    elif preds.count(1) >= 2:
        final = "HIGH RISK"
    else:
        final = "LOW RISK"

    return {
        "total_windows": len(windows),
        "window_predictions": preds,
        "window_probabilities": probs,
        "final_decision": final
    }
