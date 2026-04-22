# TraceSafe ML - Cold Chain Spoilage Prediction

## Overview

The TraceSafe ML module implements a machine learning system for **predicting agricultural product spoilage risk** in cold chain logistics. Using real-time sensor data from refrigerated transport, the system classifies products as **High Risk** or **Low Risk** for spoilage, enabling proactive interventions to reduce waste and ensure food quality.

---

## Problem Statement

Cold chain logistics for agricultural products (fruits, vegetables, dairy) is critical but challenging:
- **Temperature fluctuations** can cause rapid spoilage
- **Humidity variations** accelerate microbial growth
- **Transit duration** increases degradation risk
- **Different crops** have varying sensitivity to environmental conditions

The ML system addresses this by predicting spoilage risk based on environmental sensor data collected during transport.

---

## ML Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DATA GENERATION: Dataset.py                                  │
│    └─ Generates 30,000 realistic cold chain logistics samples   │
│    └─ Simulates sensor noise, equipment failures, weather       │
│    └─ Outputs: cold_logistics_dataset.csv                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MODEL TRAINING: cold_chain_model.py                          │
│    └─ Loads dataset & applies feature engineering               │
│    └─ Handles class imbalance with SMOTE                        │
│    └─ Trains Random Forest (300 trees)                          │
│    └─ Outputs: rf_model_6features.pkl, scaler_6features.pkl    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. PREDICTION API: server.py                                    │
│    └─ FastAPI server (port 8000)                                │
│    └─ Loads pre-trained model & scaler                          │
│    └─ Exposes /predict endpoint for real-time predictions       │
│    └─ Returns risk classification + probability scores          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. INFERENCE: prediction.py (CLI utility)                       │
│    └─ Standalone prediction function                            │
│    └─ Used for batch predictions or testing                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

The model uses **6 key environmental features** to predict spoilage risk:

| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| **crate_temp** | Float | 8-45°C | Temperature inside the refrigerated crate |
| **reefer_temp** | Float | -1-20°C | Refrigeration unit setpoint temperature |
| **humidity** | Float | 55-95% | Relative humidity in the transport container |
| **location_temp** | Float | 10-40°C | Ambient temperature at current location |
| **transit_duration** | Float | 2-72 hours | Total time in transit |
| **crop_type_encoded** | Integer | 0-3 | Crop type [0=Generic, 1=Berries, 2=Leafy Greens, 3=Dairy] |

### Feature Engineering Pipeline

```python
# Input → Scaling → Model → Classification
raw_data (6 features) → StandardScaler → RandomForest → [Low Risk, High Risk]
                                             ↓
                                    probability scores
```

---

## Dataset Generation

### File: `Dataset.py`

Generates synthetic but realistic cold chain logistics data by simulating:

1. **Base distributions**: Temperature, humidity, and crop type distributions
2. **Sensor noise**: Realistic measurement errors (±1-1.5°C)
3. **Equipment failures**: Random reefer malfunctions causing temperature spikes (+5-12°C)
4. **Environmental effects**: Ambient temperature influences crate heating
5. **Time degradation**: Spoilage increases with transit duration
6. **Missing data**: Simulates ≤3% missing sensor values
7. **Probabilistic labels**: Risk labels generated from sigmoid function combining all factors

#### Spoilage Probability Formula

```
spoilage_prob = 1 / (1 + exp(-(factors - 4)))

where factors include:
  • Temperature deviation (crate > 25°C, reefer > 10°C)
  • Humidity excess (> 85%)
  • Weather exposure (location temp > 30°C)
  • Transit duration (normalized by 72h max)
  • Crop sensitivity weights (dairy & berries = 1.6x, greens = 0.7x)
```

#### Usage

```bash
python Dataset.py
# Output: cold_logistics_dataset.csv (30,000 samples)
```

---

## Model Training

### File: `cold_chain_model.py`

Trains a Random Forest classifier with comprehensive preprocessing:

#### Training Pipeline

1. **Data Loading & Augmentation**
   - Load 30K samples from CSV
   - Optional: Flip 8% of labels to simulate real-world labeling noise

2. **Missing Value Handling**
   - Fill with median values per column

3. **Feature Scaling**
   - StandardScaler normalizes all features (mean=0, std=1)

4. **Class Balancing**
   - SMOTE (Synthetic Minority Oversampling Technique)
   - Balances High Risk vs Low Risk classes
   - Critical for imbalanced real-world data

5. **Train-Test Split**
   - 80% training, 20% testing (stratified)

6. **Model Training**
   - **Algorithm**: Random Forest Classifier
   - **Trees**: 300 estimators
   - **Random State**: 42 (reproducibility)
   - **Parallelization**: n_jobs=-1 (all cores)

#### Model Artifacts

- `rf_model_6features.pkl`: Trained Random Forest model
- `scaler_6features.pkl`: Fitted StandardScaler (for input normalization)

#### Usage

```bash
python cold_chain_model.py
# Output: 
#   - Model accuracy on test set
#   - Classification report (precision, recall, F1)
#   - Saved model & scaler artifacts
```

---

## Prediction API

### File: `server.py`

FastAPI-based REST API for real-time spoilage risk predictions.

#### API Specification

**Base URL**: `http://localhost:8000`

##### Endpoints

###### `GET /`
Health check endpoint.

**Response:**
```json
{
  "message": "Spoilage API Running"
}
```

###### `POST /predict`
Predict spoilage risk for a shipment.

**Request Body:**
```json
{
  "crate_temp": 18.5,
  "reefer_temp": 5.2,
  "humidity": 72.0,
  "location_temp": 28.0,
  "transit_duration": 12,
  "crop_type_encoded": 1
}
```

**Response (Low Risk):**
```json
{
  "prediction": "Low Risk",
  "prediction_code": 0,
  "probabilities": {
    "Low Risk": 0.87,
    "High Risk": 0.13
  }
}
```

**Response (High Risk):**
```json
{
  "prediction": "High Risk",
  "prediction_code": 1,
  "probabilities": {
    "Low Risk": 0.31,
    "High Risk": 0.69
  }
}
```

#### Startup

```bash
python server.py
# Output: Uvicorn running on http://0.0.0.0:8000
```

#### Example Client Usage (Python)

```python
import requests

url = "http://localhost:8000/predict"
payload = {
    "crate_temp": 22.0,
    "reefer_temp": 8.0,
    "humidity": 80.0,
    "location_temp": 32.0,
    "transit_duration": 24,
    "crop_type_encoded": 2
}

response = requests.post(url, json=payload)
result = response.json()
print(f"Prediction: {result['prediction']}")
print(f"Confidence: {max(result['probabilities'].values()):.2%}")
```

#### Example Client Usage (cURL)

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "crate_temp": 15.0,
    "reefer_temp": 6.0,
    "humidity": 60.0,
    "location_temp": 22.0,
    "transit_duration": 8,
    "crop_type_encoded": 2
  }'
```

---

## Standalone Prediction

### File: `prediction.py`

Utility script for offline/batch predictions without running the server.

#### Usage

```python
from prediction import predict_risk

# Single prediction
result = predict_risk({
    "crate_temp": 18.0,
    "reefer_temp": 6.5,
    "humidity": 75.0,
    "location_temp": 25.0,
    "transit_duration": 10,
    "crop_type_encoded": 1
})

print(result)
# Output:
# {
#   "prediction": "Low Risk",
#   "prediction_code": 0,
#   "probabilities": {
#     "Low Risk": 0.92,
#     "High Risk": 0.08
#   }
# }
```

#### Batch Predictions

```python
from prediction import predict_risk
import pandas as pd

# Load shipment data
shipments = pd.read_csv("shipments.csv")

predictions = []
for _, row in shipments.iterrows():
    result = predict_risk(row.to_dict())
    predictions.append(result)

# Convert to DataFrame
predictions_df = pd.DataFrame(predictions)
print(predictions_df)
```

---

## Installation & Setup

### Prerequisites

- Python 3.8+
- pip/conda package manager

### Step 1: Install Dependencies

```bash
cd ML
pip install -r requirements.txt
```

Or manually:

```bash
pip install pandas numpy scikit-learn imbalanced-learn fastapi uvicorn joblib
```

### Step 2: Generate Training Dataset

```bash
python Dataset.py
# Creates: cold_logistics_dataset.csv
```

### Step 3: Train the Model

```bash
python cold_chain_model.py
# Creates: rf_model_6features.pkl, scaler_6features.pkl
# Outputs: Accuracy & classification metrics
```

### Step 4: Start the Prediction API

```bash
python server.py
# Server runs on http://localhost:8000
```

### Step 5: Make Predictions

Using the API (in a separate terminal):

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"crate_temp": 18, "reefer_temp": 5, "humidity": 70, "location_temp": 25, "transit_duration": 12, "crop_type_encoded": 1}'
```

Or use the standalone script:

```bash
python prediction.py
```

---

## Model Performance

The trained model achieves:

- **Accuracy**: ~88-92% on test set (varies with dataset seed)
- **Precision (High Risk)**: ~85-90%
- **Recall (High Risk)**: ~80-88%
- **F1-Score (High Risk)**: ~82-89%

### Key Performance Notes

- SMOTE balancing ensures fair representation of both classes
- 300-tree ensemble reduces overfitting
- Feature scaling improves model stability
- Real-world performance depends on sensor data quality

---

## Feature Importance

Random Forest importance ranking (approximate):

1. **transit_duration** (25-30%) - Longer transits = higher spoilage risk
2. **crate_temp** (22-28%) - Primary spoilage driver
3. **reefer_temp** (15-20%) - Refrigeration effectiveness
4. **humidity** (12-18%) - Microbial growth factor
5. **crop_type_encoded** (8-12%) - Crop sensitivity variance
6. **location_temp** (5-10%) - Ambient heating effect

---

## Real-World Integration

### Backend API Integration

The TraceSafe backend can integrate spoilage predictions:

```typescript
// Example: backend/routes/batches.js
const predictions = await fetch('http://localhost:8000/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(sensorData)
});

const { prediction, probabilities } = await predictions.json();

// Store in blockchain or database
await saveSpoilageRisk({
  batchId,
  prediction,
  confidence: Math.max(...Object.values(probabilities)),
  timestamp: Date.now()
});
```

### IoT Data Pipeline

Real sensor data flows:
```
IoT Sensors → Backend DB → ML API → Risk Classification → Alert System
```

---

## Troubleshooting

### Issue: "Model not found" or "Scaler not found"

**Solution**: Run the training script first
```bash
python cold_chain_model.py
```

### Issue: API returns 422 Validation Error

**Solution**: Check request JSON has all 6 required fields with correct types
```json
{
  "crate_temp": 20.0,      // float
  "reefer_temp": 6.0,      // float
  "humidity": 75.0,        // float
  "location_temp": 25.0,   // float
  "transit_duration": 10,  // float
  "crop_type_encoded": 1   // integer (0-3)
}
```

### Issue: Poor prediction accuracy

**Solution**: 
- Re-generate dataset: `python Dataset.py`
- Retrain model: `python cold_chain_model.py`
- Collect more real training data
- Validate sensor data quality

---

## Future Enhancements

- [ ] Multi-class classification (Low/Medium/High risk)
- [ ] Time-series models (LSTM) for sequential sensor data
- [ ] Explainability: SHAP values for feature attribution
- [ ] Model versioning and A/B testing
- [ ] Real-time model retraining with new data
- [ ] Integration with blockchain for provenance
- [ ] Mobile app alerts for high-risk shipments
- [ ] Cost-benefit analysis for interventions

---

## References

- **Dataset Format**: 6 features + 1 binary target (spoilage_risk: 0/1)
- **Model Type**: Ensemble (Random Forest) - interpretable & robust
- **Deployment**: FastAPI for scalability & ease of integration
- **Problem Type**: Binary classification (imbalanced)
- **Use Case**: Cold chain logistics, food safety, waste reduction

---

## License

Part of the TraceSafe project. See root [LICENSE](../../LICENSE) for details.

---

## Contact & Support

For ML model improvements or integration questions, refer to the backend team integration guide or this README's troubleshooting section.
