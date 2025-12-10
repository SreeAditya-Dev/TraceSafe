import joblib
import numpy as np
import pandas as pd

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

def predict_risk(input_dict):

    # Build input row
    row = np.array([[input_dict[f] for f in FEATURES]], dtype=float)

    # Scale
    row_scaled = scaler.transform(row)

    # Predict
    pred = int(model.predict(row_scaled)[0])
    prob = model.predict_proba(row_scaled)[0]

    return {
        "prediction": "High Risk" if pred == 1 else "Low Risk",
        "prediction_code": pred,
        "probabilities": {
            "Low Risk": float(prob[0]),
            "High Risk": float(prob[1])
        }
    }


# Demo
if __name__ == "__main__":
    sample = {
  "crate_temp": 15.0,
  "reefer_temp": 6.0,
  "humidity": 60.0,
  "location_temp": 22.0,
  "transit_duration": 8,
  "crop_type_encoded": 2
}




    print(predict_risk(sample))