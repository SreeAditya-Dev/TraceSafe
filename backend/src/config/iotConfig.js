// IoT Configuration - Crop type encoding and default values
// Optimal storage temperatures per crop type based on agricultural standards

const CROP_TYPE_ENCODING = {
    'lettuce': 0,
    'tomato': 1,
    'mango': 2,
    'spinach': 3,
    'wheat': 4,
    'rice': 5,
    'potato': 6,
    'onion': 7,
    'carrot': 8,
    'cabbage': 9
};

// Decode crop type from number to name
const CROP_TYPE_DECODE = Object.entries(CROP_TYPE_ENCODING).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {});

// Default IoT values per crop type (optimal storage conditions)
const IOT_DEFAULTS = {
    lettuce: {
        crate_temp: 4.0,
        reefer_temp: 2.0,
        humidity: 95.0,
        location_temp: 22.0  // ambient/external temp default
    },
    tomato: {
        crate_temp: 13.0,
        reefer_temp: 10.0,
        humidity: 90.0,
        location_temp: 22.0
    },
    mango: {
        crate_temp: 15.0,
        reefer_temp: 12.0,
        humidity: 85.0,
        location_temp: 22.0
    },
    spinach: {
        crate_temp: 2.0,
        reefer_temp: 0.0,
        humidity: 95.0,
        location_temp: 22.0
    },
    wheat: {
        crate_temp: 15.0,
        reefer_temp: 12.0,
        humidity: 60.0,
        location_temp: 22.0
    },
    rice: {
        crate_temp: 15.0,
        reefer_temp: 12.0,
        humidity: 65.0,
        location_temp: 22.0
    },
    potato: {
        crate_temp: 7.0,
        reefer_temp: 4.0,
        humidity: 90.0,
        location_temp: 22.0
    },
    onion: {
        crate_temp: 5.0,
        reefer_temp: 2.0,
        humidity: 70.0,
        location_temp: 22.0
    },
    carrot: {
        crate_temp: 2.0,
        reefer_temp: 0.0,
        humidity: 95.0,
        location_temp: 22.0
    },
    cabbage: {
        crate_temp: 2.0,
        reefer_temp: 0.0,
        humidity: 95.0,
        location_temp: 22.0
    }
};

// Default fallback for unknown crops
const DEFAULT_IOT_VALUES = {
    crate_temp: 10.0,
    reefer_temp: 8.0,
    humidity: 80.0,
    location_temp: 22.0
};

/**
 * Get IoT defaults for a given crop type
 * @param {string} cropName - Name of the crop (e.g., 'mango', 'tomato')
 * @returns {object} IoT default values
 */
function getIoTDefaults(cropName) {
    const normalizedCrop = cropName?.toLowerCase().trim();
    return IOT_DEFAULTS[normalizedCrop] || DEFAULT_IOT_VALUES;
}

/**
 * Get crop type encoding number
 * @param {string} cropName - Name of the crop
 * @returns {number} Encoded crop type or -1 if unknown
 */
function getCropTypeEncoded(cropName) {
    const normalizedCrop = cropName?.toLowerCase().trim();
    return CROP_TYPE_ENCODING[normalizedCrop] ?? -1;
}

/**
 * Get crop name from encoded value
 * @param {number} code - Encoded crop type
 * @returns {string} Crop name or 'unknown'
 */
function getCropNameFromCode(code) {
    return CROP_TYPE_DECODE[code] || 'unknown';
}

export {
    CROP_TYPE_ENCODING,
    CROP_TYPE_DECODE,
    IOT_DEFAULTS,
    DEFAULT_IOT_VALUES,
    getIoTDefaults,
    getCropTypeEncoded,
    getCropNameFromCode
};
