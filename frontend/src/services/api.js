import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (email, password) => {
        // Note: FastAPI OAuth2PasswordRequestForm expects form data
        const formData = new URLSearchParams();
        formData.append('username', email); // Use empty string or custom logic if necessary, here we pass email as username per standard Auth schema if we used OAuth2.. BUT we created a custom route!
        // Since we created our OWN custom Pydantic schemas for login (UserLogin), we send JSON!
        const response = await api.post('/api/auth/login', { email, password });
        return response.data;
    },
    register: async (email, password, full_name, role) => {
        const response = await api.post('/api/auth/register', { email, password, full_name, role });
        return response.data;
    },
    getMe: async () => {
        const response = await api.get('/api/auth/me');
        return response.data;
    }
};

export const interactionService = {
    analyze: async (drug_names) => {
        const response = await api.post('/api/interactions/analyze', { drug_names });
        return response.data;
    },
    getHistory: async () => {
        const response = await api.get('/api/interactions/history');
        return response.data;
    },
    searchDrugs: async (query) => {
        const response = await api.get(`/api/interactions/drugs/search?q=${query}`);
        return response.data;
    }
};

export const riskService = {
    assess: async (drug_names, patient_profile_id = null) => {
        const response = await api.post('/api/risk/assess', { drug_names, patient_profile_id });
        return response.data;
    },
    getHistory: async () => {
        const response = await api.get('/api/risk/history');
        return response.data;
    },
    getAssessment: async (id) => {
        const response = await api.get(`/api/risk/assess/${id}`);
        return response.data;
    },
    getDoctorSummary: async () => {
        const response = await api.get('/api/risk/doctor/patients/summary');
        return response.data;
    }
};

export const patientService = {
    getProfile: async () => {
        const response = await api.get('/api/patient/profile');
        return response.data;
    },
    createProfile: async (data) => {
        const response = await api.post('/api/patient/profile', data);
        return response.data;
    },
    updateProfile: async (data) => {
        const response = await api.put('/api/patient/profile', data);
        return response.data;
    },
    getAllPatients: async () => {
        const response = await api.get('/api/patient/all');
        return response.data;
    }
};

export default api;
