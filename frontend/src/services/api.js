import axios from 'axios';

const normalizeApiBase = (value) => {
  const rawValue = value?.trim();
  if (!rawValue) return '/api';

  const withoutTrailingSlash = rawValue.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
};

const API_BASE = normalizeApiBase(process.env.REACT_APP_API_URL);

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

const getParticipantKey = () => {
  const storageKey = 'pollify_participant_key';
  let value = localStorage.getItem(storageKey);

  if (!value) {
    value = crypto?.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(storageKey, value);
  }

  return value;
};

// Request interceptor - JWT token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url?.startsWith('/public/')) {
    config.headers['X-Participant-Key'] = getParticipantKey();
  }
  return config;
});

// Response interceptor - 401 durumunda logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('kullanici');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── AUTH ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── ADMIN ─────────────────────────────────────────────────────
export const adminAPI = {
  createSurvey: (data) => api.post('/admin/surveys', data),
  getSurveys: () => api.get('/admin/surveys'),
  getSurveyById: (id) => api.get(`/admin/surveys/${id}`),
  getDashboard: (id) => api.get(`/admin/surveys/${id}/dashboard`),
  getCrossTabAnalysis: (surveyId, rowQuestionId, columnQuestionId) => api.get(`/admin/surveys/${surveyId}/crosstab`, {
    params: { rowQuestionId, columnQuestionId },
  }),
  exportResponses: (id) => api.get(`/admin/surveys/${id}/export`, { responseType: 'blob' }),
  duplicateSurvey: (id, data) => api.post(`/admin/surveys/${id}/duplicate`, data),
  updateSurvey: (id, data) => api.put(`/admin/surveys/${id}`, data),
  deleteSurvey: (id) => api.delete(`/admin/surveys/${id}`),
};

// ── PUBLIC ────────────────────────────────────────────────────
export const publicAPI = {
  getSurveyByToken: (token, options = {}) => api.get(`/public/surveys/share/${token}`, {
    params: options.kiosk ? { kiosk: '1' } : undefined,
  }),
  startSurvey: (token, options = {}) => api.post(`/public/surveys/start/${token}`, {
    kiosk: !!options.kiosk,
  }),
  submitResponse: (data) => api.post('/public/responses/submit', data),
};

export default api;
