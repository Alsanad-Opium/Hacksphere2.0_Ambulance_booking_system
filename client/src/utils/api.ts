import axios from 'axios';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response && error.response.status === 401) {
      // If we're not on the login page, clear storage and redirect
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API Functions
export const authAPI = {
  login: (credentials: { email: string; password: string }) => {
    return api.post('/api/auth/login', credentials);
  },
  
  register: (userData: { name: string; email: string; phone: string; password: string }) => {
    return api.post('/api/auth/register', userData);
  },
  
  forgotPassword: (email: string) => {
    return api.post('/api/auth/forgot-password', { email });
  },
  
  resetPassword: (token: string, password: string) => {
    return api.post('/api/auth/reset-password', { token, password });
  },
  
  verifyEmail: (token: string) => {
    return api.get(`/api/auth/verify-email/${token}`);
  },
  
  refreshToken: () => {
    return api.post('/api/auth/refresh-token');
  }
};

// User API Functions
export const userAPI = {
  getProfile: () => {
    return api.get('/api/users/profile');
  },
  
  updateProfile: (userData: any) => {
    return api.put('/api/users/profile', userData);
  },
  
  updatePassword: (passwordData: { currentPassword: string; newPassword: string }) => {
    return api.put('/api/users/password', passwordData);
  }
};

// Emergency API Functions
export const emergencyAPI = {
  createEmergency: (emergencyData: any) => {
    return api.post('/api/emergencies', emergencyData);
  },
  
  getEmergencies: (params?: any) => {
    return api.get('/api/emergencies', { params });
  },
  
  getEmergencyById: (id: string) => {
    return api.get(`/api/emergencies/${id}`);
  },
  
  updateEmergencyStatus: (id: string, status: string) => {
    return api.put(`/api/emergencies/${id}/status`, { status });
  },
  
  cancelEmergency: (id: string, reason: string) => {
    return api.put(`/api/emergencies/${id}/cancel`, { reason });
  }
};

// Ambulance API Functions
export const ambulanceAPI = {
  getAmbulances: (params?: any) => {
    return api.get('/api/ambulances', { params });
  },
  
  getAmbulanceById: (id: string) => {
    return api.get(`/api/ambulances/${id}`);
  },
  
  getNearbyAmbulances: (lat: number, lng: number, radius?: number) => {
    return api.get('/api/ambulances/nearby', { 
      params: { lat, lng, radius: radius || 5 } 
    });
  },
  
  updateLocation: (id: string, location: { lat: number; lng: number }) => {
    return api.put(`/api/ambulances/${id}/location`, location);
  },
  
  updateStatus: (id: string, status: string) => {
    return api.put(`/api/ambulances/${id}/status`, { status });
  }
};

// Hospital API Functions
export const hospitalAPI = {
  getHospitals: (params?: any) => {
    return api.get('/api/hospitals', { params });
  },
  
  getHospitalById: (id: string) => {
    return api.get(`/api/hospitals/${id}`);
  },
  
  getNearbyHospitals: (lat: number, lng: number, radius?: number) => {
    return api.get('/api/hospitals/nearby', { 
      params: { lat, lng, radius: radius || 5 } 
    });
  }
};

// Payment API Functions
export const paymentAPI = {
  createPayment: (paymentData: any) => {
    return api.post('/api/payments', paymentData);
  },
  
  getPayments: (params?: any) => {
    return api.get('/api/payments', { params });
  },
  
  getPaymentById: (id: string) => {
    return api.get(`/api/payments/${id}`);
  },
  
  updatePaymentStatus: (id: string, status: string) => {
    return api.put(`/api/payments/${id}/status`, { status });
  },
  
  processRefund: (id: string, amount: number) => {
    return api.post(`/api/payments/${id}/refund`, { amount });
  }
};

export default api; 