import numpy as np

def generate_multivariate_lstm_dataset(n_sequences=30000, seq_len=5):
    X = []
    y = []

    for _ in range(n_sequences):

        # ------- STATIC FIELDS --------
        base_reefer = np.random.uniform(4, 10)
        base_humidity = np.random.uniform(55, 90)
        base_location_temp = np.random.uniform(10, 35)
        transit_duration = np.random.uniform(2, 48)
        crop_type = np.random.randint(0, 4)

        has_spike = np.random.rand() < 0.5  # 50% are HIGH RISK

        # ------- NORMAL (LOW RISK) PATTERN --------
        if not has_spike:
            crate_temps = list(np.random.normal(16, 1, seq_len))
            reefer_vals = [base_reefer] * seq_len
            humidity_vals = [base_humidity] * seq_len
            location_vals = [base_location_temp] * seq_len
            duration_vals = [transit_duration] * seq_len

            label = 0

        # ------- HIGH RISK MULTI-SPIKE PATTERN --------
        else:
            # crate temp spike
            crate_temps = list(np.random.normal(16, 1, seq_len))
            spike_pos = np.random.randint(1, seq_len-2)

            crate_temps[spike_pos] = np.random.uniform(30, 36)
            crate_temps[spike_pos + 1] = crate_temps[spike_pos] + np.random.uniform(0, 2)

            # reefer failure spike
            reefer_vals = [base_reefer] * seq_len
            reefer_vals[spike_pos] = base_reefer + np.random.uniform(5, 12)

            # humidity condensation spike
            humidity_vals = [base_humidity] * seq_len
            humidity_vals[spike_pos] = np.random.uniform(90, 98)

            # external heat (location temp)
            location_vals = [base_location_temp] * seq_len
            location_vals[spike_pos] = base_location_temp + np.random.uniform(8, 15)

            # transit duration anomaly (e.g., unexpected delay)
            duration_vals = [transit_duration] * seq_len
            duration_vals[spike_pos] += np.random.uniform(5, 15)

            label = 1

        # ------- Build final sequence shape (seq_len × 6) --------
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
