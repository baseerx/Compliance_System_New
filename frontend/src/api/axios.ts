import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:9002/api/',
  withCredentials: true,  
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - har request mein token add karo
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('✅ Token added to header');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;