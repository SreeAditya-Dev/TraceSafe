from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import numpy as np
import uvicorn

# ------------------------------
# Load model + scaler
# ------------------------------
MODEL_PATH = "rf_model_6features.pkl"
SCALER_PATH = "scaler_6features.pkl"

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)

FEATURES = [
    "crate_temp",
    "reefer_temp",
    "humidity",
    "location_temp",
    "transit_duration",
    "crop_type_encoded"
]

# ------------------------------
# Request Schema (ONLY 6 FEATURES)
# ------------------------------
class SpoilageInput(BaseModel):
    crate_temp: float
    reefer_temp: float
    humidity: float
    location_temp: float
    transit_duration: float
    crop_type_encoded: int

# ------------------------------
# Prediction Function
# ------------------------------
def predict_risk(data: dict):

    row = np.array([[data[f] for f in FEATURES]], dtype=float)

    row_scaled = scaler.transform(row)

    pred_class = int(model.predict(row_scaled)[0])
    proba = model.predict_proba(row_scaled)[0]

    return {
        "prediction": "High Risk" if pred_class == 1 else "Low Risk",
        "prediction_code": pred_class,
        "probabilities": {
            "Low Risk": float(proba[0]),
            "High Risk": float(proba[1])
        }
    }

# ------------------------------
# FastAPI App
# ------------------------------
app = FastAPI(
    title="Spoilage Prediction API",
    version="1.0"
)

@app.get("/")
def home():
    return {"message": "Spoilage API Running"}

@app.post("/predict")
def predict(payload: SpoilageInput):
    data = payload.dict()
    return predict_risk(data)

# ------------------------------
# Run server
# ------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)