import numpy as np

def generate_multivariate_lstm_dataset(n_sequences=30000, seq_len=5):
    X = []
    y = []

    for _ in range(n_sequences):

        # ------- STATIC FIELDS --------
        base_reefer = np.random.uniform(4, 10)
        base_humidity = np.random.uniform(55, 85)
        base_location_temp = np.random.uniform(10, 35)
        transit_duration = np.random.uniform(2, 48)
        crop_type = np.random.randint(0, 4)

        has_spike = np.random.rand() < 0.5  # 50% high risk

        # ------- LOW RISK (stable, no spike) --------
        if not has_spike:

            # Allow warm stable low-risk journeys too
            base_temp = np.random.uniform(15, 23)
            crate_temps = list(np.random.normal(base_temp, 0.4, seq_len))

            reefer_vals = [base_reefer] * seq_len
            humidity_vals = [base_humidity] * seq_len
            location_vals = [base_location_temp] * seq_len
            duration_vals = [transit_duration] * seq_len

            label = 0

        # ------- HIGH RISK MULTI-FEATURE SPIKE --------
        else:
            # Step 1 — start with stable temps
            base_temp = np.random.uniform(15, 22)
            crate_temps = list(np.random.normal(base_temp, 0.4, seq_len))

            # Step 2 — choose spike index (not last pos)
            spike_pos = np.random.randint(0, seq_len - 1)

            # crate temperature spike
            spike_val = np.random.uniform(30, 36)
            crate_temps[spike_pos] = spike_val
            crate_temps[spike_pos + 1] = spike_val + np.random.uniform(0, 2)

            # reefer spike (failure)
            reefer_vals = [base_reefer] * seq_len
            reefer_vals[spike_pos] = base_reefer + np.random.uniform(5, 12)

            # humidity spike (condensation event)
            humidity_vals = [base_humidity] * seq_len
            humidity_vals[spike_pos] = np.random.uniform(90, 98)

            # external heat spike
            location_vals = [base_location_temp] * seq_len
            location_vals[spike_pos] = base_location_temp + np.random.uniform(8, 15)

            # extended transit delay spike
            duration_vals = [transit_duration] * seq_len
            duration_vals[spike_pos] += np.random.uniform(5, 15)

            label = 1

        # ------- Build final multivariate sequence (seq_len × 6) --------
        seq = []
        for i in range(seq_len):
            seq.append([
                crate_temps[i],
                reefer_vals[i],
                humidity_vals[i],
                location_vals[i],
                duration_vals[i],
                crop_type
            ])

        X.append(seq)
        y.append(label)

    return np.array(X), np.array(y)
