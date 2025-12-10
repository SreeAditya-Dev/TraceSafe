import numpy as np
import pandas as pd

def generate_realistic_logistics_data(n=30000, seed=42):
    np.random.seed(seed)

    # ---------------------------
    # 1. Base Feature Ranges (Proper Real-World)
    # ---------------------------
    crate_temp = np.random.normal(loc=20, scale=6, size=n)     # sometimes 10–40 in real
    reefer_temp = np.random.normal(loc=6, scale=3, size=n)     # 0–12 typical
    humidity = np.random.uniform(55, 95, n)
    location_temp = np.random.uniform(10, 40, n)
    transit_duration = np.random.uniform(2, 72, n)
    crop_type_encoded = np.random.randint(0, 4, size=n)

    # clamp realistic bounds
    crate_temp = np.clip(crate_temp, 8, 45)
    reefer_temp = np.clip(reefer_temp, -1, 20)

    # ---------------------------
    # 2. Add Sensor Noise (Realistic)
    # ---------------------------
    crate_temp += np.random.normal(0, 1.2, n)
    reefer_temp += np.random.normal(0, 0.8, n)
    humidity += np.random.normal(0, 1.5, n)

    # ---------------------------
    # 3. Introduce Random Spikes (reefer failure bursts)
    # ---------------------------
    spike_idx = np.random.choice(n, size=int(n*0.05), replace=False)
    crate_temp[spike_idx] += np.random.uniform(5, 12, len(spike_idx))

    # ---------------------------
    # 4. Weather Effect on crate temperature
    # ---------------------------
    crate_temp += (location_temp - 25) * np.random.uniform(0.05, 0.12)

    # ---------------------------
    # 5. Time-based spoilage drift
    # ---------------------------
    crate_temp += (transit_duration / 24) * np.random.uniform(0.5, 1.5)

    # ---------------------------
    # 6. Missing Values (Simulated Variable Sensor Loss)
    # ---------------------------
    crate_mask = np.random.rand(n) < 0.03
    reefer_mask = np.random.rand(n) < 0.03
    humidity_mask = np.random.rand(n) < 0.03
    
    crate_temp[crate_mask] = np.nan
    reefer_temp[reefer_mask] = np.nan
    humidity[humidity_mask] = np.nan

    # ---------------------------
    # 7. Now Build Probability of Spoilage
    # ---------------------------
    spoilage_prob = np.zeros(n)

    # Temperature contribution
    spoilage_prob += np.maximum(0, np.nan_to_num(crate_temp) - 25) * 0.04
    spoilage_prob += np.maximum(0, np.nan_to_num(reefer_temp) - 10) * 0.05

    # Humidity contribution
    spoilage_prob += np.maximum(0, np.nan_to_num(humidity) - 85) * 0.03

    # Weather contribution
    spoilage_prob += np.maximum(0, location_temp - 30) * 0.02

    # Transit duration
    spoilage_prob += (transit_duration / 72) * 0.5

    # Crop sensitivity
    crop_weights = {0:1.0, 1:1.4, 2:0.7, 3:1.6}
    spoilage_prob += np.array([crop_weights[c] for c in crop_type_encoded]) * 0.15

    # Normalize to probability range
    spoilage_prob = 1 / (1 + np.exp(-spoilage_prob + 4))

    # ---------------------------
    # 8. Final risk label (probabilistic, real-world)
    # ---------------------------
    spoilage_risk = np.random.binomial(1, spoilage_prob)

    # ---------------------------
    # 9. Build DataFrame
    # ---------------------------
    df = pd.DataFrame({
        "crate_temp": crate_temp,
        "reefer_temp": reefer_temp,
        "humidity": humidity,
        "location_temp": location_temp,
        "transit_duration": transit_duration,
        "crop_type_encoded": crop_type_encoded,
        "spoilage_risk": spoilage_risk
    })

    # Save dataset
    df.to_csv("cold_logistics_dataset.csv", index=False)
    print("Generated realistic dataset: realistic_logistics_dataset.csv")
    print(df.head())
    print("\nSpoilage Rate:", df['spoilage_risk'].mean())

    return df

generate_realistic_logistics_data()