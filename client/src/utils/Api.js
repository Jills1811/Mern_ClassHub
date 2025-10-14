import axios from 'axios';

const API = axios.create({
  baseURL: import.meta?.env?.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If sending FormData, let the browser set multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid redirect loops on static download failures; ignore for file/blob requests
      const contentType = error.response.headers?.['content-type'] || '';
      const requestUrl = error.config?.url || '';
      const isBlob = error.config?.responseType === 'blob' || contentType.includes('octet-stream');
      const isStatic = /\/uploads\//.test(requestUrl);
      if (!isBlob && !isStatic) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;