import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const authApi = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
};

export const clientsApi = {
  list: (params) => api.get('/api/clients', { params }),
  get: (id) => api.get(`/api/clients/${id}`),
  create: (data) => api.post('/api/clients', data),
  update: (id, data) => api.put(`/api/clients/${id}`, data),
  delete: (id) => api.delete(`/api/clients/${id}`),
};

export const bookingsApi = {
  list: (params) => api.get('/api/bookings', { params }),
  create: (data) => api.post('/api/bookings', data),
  update: (id, data) => api.put(`/api/bookings/${id}`, data),
  cancel: (id) => api.delete(`/api/bookings/${id}`),
};

export const conversationsApi = {
  list: (params) => api.get('/api/conversations', { params }),
  get: (id) => api.get(`/api/conversations/${id}`),
  stats: () => api.get('/api/conversations/stats/summary'),
};

export const campaignsApi = {
  list: () => api.get('/api/campaigns'),
  create: (data) => api.post('/api/campaigns', data),
  setStatus: (id, status) => api.put(`/api/campaigns/${id}/status`, { status }),
  getCalls: (id) => api.get(`/api/campaigns/${id}/calls`),
  runBatch: () => api.post('/api/campaigns/run-batch'),
};

export default api;
