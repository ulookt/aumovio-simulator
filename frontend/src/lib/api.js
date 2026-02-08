import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Scenario APIs
export const createScenario = (scenarioData) =>
    api.post('/scenarios/', scenarioData);

export const getScenarios = () =>
    api.get('/scenarios/');

export const getScenario = (id) =>
    api.get(`/scenarios/${id}`);

// Job APIs
export const createJob = (jobData) =>
    api.post('/jobs/', jobData);

export const getJobs = () =>
    api.get('/jobs/');

export const getJob = (id) =>
    api.get(`/jobs/${id}`);

// Metrics APIs
export const getJobMetrics = (jobId) =>
    api.get(`/metrics/${jobId}`);

export const getComputeMetrics = (jobId) =>
    api.get(`/compute/${jobId}`);

export const getRiskAnalysis = (jobId) =>
    api.get(`/risk/${jobId}`);

export const getInsights = (jobId) =>
    api.get(`/insights/${jobId}`);

export default api;
