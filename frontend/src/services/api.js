import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000",
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const authService = {
    login: (email, password) =>
        api.post("/api/auth/login", { email, password }),
    register: (email, password, full_name, role) =>
        api.post("/api/auth/register", { email, password, full_name, role }),
    getMe: () => api.get("/api/auth/me"),
};

export const interactionService = {
    analyze: (drug_names) =>
        api.post("/api/interactions/analyze", { drug_names }),
    getHistory: () => api.get("/api/interactions/history"),
    searchDrugs: (query) =>
        api.get(`/api/interactions/drugs/search?q=${query}`),
};

export const riskService = {
    assess: (drug_names, patient_profile_id = null) =>
        api.post("/api/risk/assess", { drug_names, patient_profile_id }),
    getHistory: () => api.get("/api/risk/history"),
    getAssessment: (id) => api.get(`/api/risk/assess/${id}`),
    getDoctorSummary: () => api.get("/api/risk/doctor/patients/summary"),
};

export const patientService = {
    getProfile: () => api.get("/api/patient/profile"),
    createProfile: (data) => api.post("/api/patient/profile", data),
    updateProfile: (data) => api.put("/api/patient/profile", data),
    getAllPatients: () => api.get("/api/patient/all"),
};

export const pkService = {
    simulate: (drug_names, doses = {}, patient_profile_id = null) =>
        api.post("/api/pk/simulate", { drug_names, doses, patient_profile_id }),
    getDrug: (drug_name) => api.get(`/api/pk/drug/${drug_name}`),
    getSupportedDrugs: () => api.get("/api/pk/supported-drugs"),
};

export const aiService = {
    explain: (assessment_id) =>
        api.post("/api/ai/explain", { assessment_id }),
    getDrugInfo: (drug_name) =>
        api.post("/api/ai/drug-info", { drug_name }),
    getRecommendations: (assessment_id) =>
        api.post("/api/ai/recommendations", { assessment_id }),
    searchEnriched: (q) =>
        api.get(`/api/ai/drug-search-enriched?q=${q}`),
};

export const lifestyleService = {
    getLog: () => api.get("/api/lifestyle/log"),
    createLog: (data) => api.post("/api/lifestyle/log", data),
    updateLog: (data) => api.put("/api/lifestyle/log", data),
    analyze: (drug_names, patient_profile_id = null) =>
        api.post("/api/lifestyle/analyze", { drug_names, patient_profile_id }),
    getHistory: () => api.get("/api/lifestyle/history"),
};

export default api;
