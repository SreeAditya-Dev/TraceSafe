import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential # type: ignore
from tensorflow.keras.layers import LSTM, Dense # type: ignore
import joblib

from dataset_lstm import generate_multivariate_lstm_dataset

SEQ_LEN = 5
NUM_FEATURES = 6

# -------------------------
# Generate dataset
# -------------------------
X, y = generate_multivariate_lstm_dataset(20000, SEQ_LEN)

# -------------------------
# Scale features
# -------------------------
scaler = MinMaxScaler()
X_reshaped = X.reshape(-1, NUM_FEATURES)
X_scaled = scaler.fit_transform(X_reshaped)

# Save scaler
joblib.dump(scaler, "scaler_multi.pkl")

# reshape back into sequences
X_scaled = X_scaled.reshape(-1, SEQ_LEN, NUM_FEATURES)

# -------------------------
# Train/val split
# -------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# -------------------------
# Build LSTM model
# -------------------------
model = Sequential([
    LSTM(64, return_sequences=False, input_shape=(SEQ_LEN, NUM_FEATURES)),
    Dense(32, activation='relu'),
    Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# -------------------------
# Train
# -------------------------
history = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=12,
    batch_size=32,
    verbose=1
)

model.save("lstm_multivariate.h5")
print("Training complete!")
