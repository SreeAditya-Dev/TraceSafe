import axios from 'axios';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

/**
 * Call ML model to predict spoilage risk
 * @param {Object} iotData - IoT sensor data
 * @returns {Promise<Object>} Prediction result
 */
export async function predictSpoilageRisk(iotData) {
    try {
        const response = await axios.post(`${ML_API_URL}/predict`, {
            crate_temp: parseFloat(iotData.crate_temp) || 0,
            reefer_temp: parseFloat(iotData.reefer_temp) || 0,
            humidity: parseFloat(iotData.humidity) || 0,
            location_temp: parseFloat(iotData.location_temp) || 0,
            transit_duration: parseInt(iotData.transit_duration) || 0,
            crop_type_encoded: parseInt(iotData.crop_type_encoded) || 0
        });

        return {
            prediction: response.data.prediction, // "High Risk" or "Low Risk"
            prediction_code: response.data.prediction_code, // 1 or 0
            probabilities: response.data.probabilities
        };
    } catch (error) {
        console.error('ML API Error:', error.message);
        // Return null if ML service is unavailable
        return null;
    }
}

/**
 * Check if ML service is available
 * @returns {Promise<boolean>}
 */
export async function checkMLHealth() {
    try {
        const response = await axios.get(`${ML_API_URL}/`, { timeout: 2000 });
        return response.data.message === 'Spoilage API Running';
    } catch (error) {
        return false;
    }
}
