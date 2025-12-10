# sliding.py

import numpy as np

SEQ_LEN = 5      # your LSTM training sequence length
STRIDE = 1        # slide by 1 timestep for maximum sensitivity

def create_windows(seq, seq_len=SEQ_LEN, stride=STRIDE):
    """
    Convert variable-length sequence (T,6) → windows of shape (N, seq_len, 6)
    """
    seq = np.array(seq, dtype=float)
    T = len(seq)

    if T < seq_len:
        raise ValueError(f"Sequence too short. Got {T}, need at least {seq_len}")

    windows = []
    for start in range(0, T - seq_len + 1, stride):
        window = seq[start:start + seq_len]
        windows.append(window)

    return np.array(windows)
