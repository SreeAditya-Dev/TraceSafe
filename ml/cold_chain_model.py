import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from imblearn.over_sampling import SMOTE
import joblib

# Load dataset
df = pd.read_csv("cold_logistics_dataset.csv")
flip_rate = 0.08
n = len(df)
flip_idx = np.random.choice(n, size=int(n*flip_rate), replace=False)
df.loc[flip_idx, "spoilage_risk"] = 1 - df.loc[flip_idx, "spoilage_risk"]

FEATURES = [
    "crate_temp",
    "reefer_temp",
    "humidity",
    "location_temp",
    "transit_duration",
    "crop_type_encoded"
]

X = df[FEATURES]
y = df["spoilage_risk"]

# Handle any missing values
X = X.fillna(X.median())

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Apply SMOTE to balance Low vs High risk
sm = SMOTE(random_state=42)
X_bal, y_bal = sm.fit_resample(X_scaled, y)

print("Class distribution after SMOTE:", np.bincount(y_bal))

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X_bal, y_bal, test_size=0.2, random_state=42
)

# Model
model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Save artifacts
joblib.dump(model, "rf_model_6features.pkl")
joblib.dump(scaler, "scaler_6features.pkl")

print("Model and scaler saved successfully.")
