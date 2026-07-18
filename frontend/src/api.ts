import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('visionops_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized access
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out.');
      localStorage.removeItem('visionops_token');
      localStorage.removeItem('visionops_user');
      // Only redirect if not already on login/register pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Helpers
export const authApi = {
  login: (data: any) => apiClient.post('/auth/login', data),
  register: (data: any) => apiClient.post('/auth/register', data),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
};

export const cameraApi = {
  list: () => apiClient.get('/cameras'),
  get: (id: string) => apiClient.get(`/cameras/${id}`),
  create: (data: any) => apiClient.post('/cameras', data),
  update: (id: string, data: any) => apiClient.put(`/cameras/${id}`, data),
  delete: (id: string) => apiClient.delete(`/cameras/${id}`),
};

export const alertApi = {
  list: () => apiClient.get('/alerts'),
  updateStatus: (id: string, data: { status: string; notes?: string; assignedTo?: string }) => 
    apiClient.put(`/alerts/${id}`, data),
};

export const reportsApi = {
  getCsvUrl: (filters: { startDate?: string; endDate?: string; cameraId?: string; severity?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    const token = localStorage.getItem('visionops_token') || '';
    return `${API_BASE_URL}/reports/csv?token=${token}&${params}`;
  },
  getPdfUrl: (filters: { startDate?: string; endDate?: string; cameraId?: string; severity?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    const token = localStorage.getItem('visionops_token') || '';
    return `${API_BASE_URL}/reports/pdf?token=${token}&${params}`;
  },
  getExcelUrl: (filters: { startDate?: string; endDate?: string; cameraId?: string; severity?: string }) => {
    const params = new URLSearchParams(filters as any).toString();
    const token = localStorage.getItem('visionops_token') || '';
    return `${API_BASE_URL}/reports/excel?token=${token}&${params}`;
  },
};

export const usersApi = {
  list: () => apiClient.get('/users'),
  update: (id: string, data: { role?: string; status?: string }) => apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data: any) => apiClient.put('/settings', data),
};

export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
export default apiClient;
