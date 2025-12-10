// Weather Service - Fetch location temperature from OpenWeather API
const axios = require('axios');

// OpenWeather API - Free tier key (replace with your own for production)
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '4d8fb5b93d4af21d66a2948710284366';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Get current temperature at a location from OpenWeather API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<number>} Temperature in Celsius
 */
async function getLocationTemperature(lat, lng) {
    try {
        if (!lat || !lng || lat === 0 || lng === 0) {
            console.log('[Weather] Invalid coordinates, using default temp');
            return 22.0; // Default temperature
        }

        const response = await axios.get(OPENWEATHER_BASE_URL, {
            params: {
                lat: lat,
                lon: lng,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            },
            timeout: 5000
        });

        const temp = response.data?.main?.temp;
        console.log(`[Weather] Location (${lat}, ${lng}) temp: ${temp}°C`);
        return temp ?? 22.0;
    } catch (error) {
        console.error('[Weather] Failed to fetch temperature:', error.message);
        return 22.0; // Fallback to default
    }
}

/**
 * Get weather info for a location (extended data)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Weather data
 */
async function getWeatherInfo(lat, lng) {
    try {
        if (!lat || !lng || lat === 0 || lng === 0) {
            return {
                temperature: 22.0,
                humidity: 60,
                description: 'Unknown',
                fetched: false
            };
        }

        const response = await axios.get(OPENWEATHER_BASE_URL, {
            params: {
                lat: lat,
                lon: lng,
                appid: OPENWEATHER_API_KEY,
                units: 'metric'
            },
            timeout: 5000
        });

        return {
            temperature: response.data?.main?.temp ?? 22.0,
            humidity: response.data?.main?.humidity ?? 60,
            description: response.data?.weather?.[0]?.description ?? 'Unknown',
            city: response.data?.name,
            fetched: true
        };
    } catch (error) {
        console.error('[Weather] Failed to fetch weather info:', error.message);
        return {
            temperature: 22.0,
            humidity: 60,
            description: 'Unknown',
            fetched: false
        };
    }
}

module.exports = {
    getLocationTemperature,
    getWeatherInfo
};
