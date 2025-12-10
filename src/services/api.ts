import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth endpoints
export const authAPI = {
    register: (data: { email: string; password: string; name: string; role: string; phone?: string }) =>
        api.post('/api/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/api/auth/login', data),

    loginWithAgriStack: (data: { agristackId: string }) =>
        api.post('/api/auth/agristack-login', data),

    quickLogin: (data: { role: string; name?: string }) =>
        api.post('/api/auth/quick-login', data),

    getProfile: () =>
        api.get('/api/auth/me'),

    updateProfile: (data: any) =>
        api.put('/api/auth/profile', data),
};

// AgriStack endpoints
export const agristackAPI = {
    getFarmers: (params?: { search?: string; verified?: boolean; limit?: number; offset?: number }) =>
        api.get('/api/agristack', { params }),

    verifyFarmer: (farmerId: string) =>
        api.get(`/api/agristack/verify/${farmerId}`),

    onboardFarmer: (data: { agristackId: string; phone?: string; state?: string; district?: string; village?: string }) =>
        api.post('/api/agristack/onboard', data),

    getStats: () =>
        api.get('/api/agristack/stats'),

    sync: () =>
        api.post('/api/agristack/sync'),
};

// Batch endpoints
export const batchAPI = {
    create: (formData: FormData) =>
        api.post('/api/batches', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),

    getAll: (params?: { status?: string; crop?: string; limit?: number; offset?: number }) =>
        api.get('/api/batches', { params }),

    getById: (batchId: string) =>
        api.get(`/api/batches/${batchId}`),

    pickup: (batchId: string, data: { latitude?: number; longitude?: number; notes?: string; image?: string | null } | FormData) =>
        api.post(`/api/batches/${batchId}/pickup`, data, {
            headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        }),

    updateTransit: (batchId: string, data: { latitude?: number; longitude?: number; temperature?: number; humidity?: number; notes?: string; image?: string | null } | FormData) =>
        api.post(`/api/batches/${batchId}/transit`, data, {
            headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        }),

    deliver: (batchId: string, data: { latitude?: number; longitude?: number; retailerId?: string; notes?: string; image?: string | null } | FormData) =>
        api.post(`/api/batches/${batchId}/deliver`, data, {
            headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
        }),

    receive: (batchId: string, data: { latitude?: number; longitude?: number; notes?: string }) =>
        api.post(`/api/batches/${batchId}/receive`, data),

    sell: (batchId: string, data: { notes?: string }) =>
        api.post(`/api/batches/${batchId}/sell`, data),

    getJourney: (batchId: string) =>
        api.get(`/api/batches/${batchId}/journey`),

    getRetailers: () =>
        api.get('/api/batches/retailers'),
};

// Media endpoints
export const mediaAPI = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/api/media/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadMultiple: (files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        return api.post('/api/media/upload-multiple', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Stats endpoint
export const statsAPI = {
    get: () => api.get('/api/stats'),
};

// Government Dashboard endpoints
export const govtAPI = {
    getEnamPrices: () => api.get('/api/govt/enam/prices'),
    verifyFssaiLicense: (number: string) => api.get(`/api/govt/fssai/license/${number}`),
    getFssaiCompliance: () => api.get('/api/govt/fssai/compliance'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;
