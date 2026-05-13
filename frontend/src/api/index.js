import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      const networkError = new Error(`Network Error: Unable to reach ${API_BASE_URL}`);
      networkError.isAxiosNetworkError = true;
      return Promise.reject(networkError);
    }

    // Handle 401 - Try to refresh token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Call refresh endpoint
          const response = await API.post('/auth/token/refresh/', {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return API(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // No refresh token - redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }

    if (error.response.status >= 500) {
      console.error('Server error:', error.response);
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register/', data),
  login: (data) => API.post('/auth/login/', data),
  getProfile: () => API.get('/auth/profile/'),
  updateProfile: (data) => API.patch('/auth/profile/', data),
  getProviderProfile: () => API.get('/auth/provider/profile/'),
  updateProviderProfile: (data) => API.patch('/auth/provider/profile/', data),
  setAvailability: (data) => API.post('/auth/provider/availability/', data),
  getProviders: (params) => API.get('/auth/providers/', { params }),
  getProvider: (id) => API.get(`/auth/providers/${id}/`),
  updateProvider: (id, data) => API.patch(`/auth/providers/${id}/`, data),
  getAllProviders: () => API.get('/auth/providers/all/'),
  getAllUsers: () => API.get('/auth/users/all/'),
  
  // New Auth Features
  socialLogin: (data) => API.post('/auth/social-login/', data),
  forgotPassword: (data) => API.post('/auth/forgot-password/', data),
  resetPassword: (data) => API.post('/auth/reset-password/', data),
  changePassword: (data) => API.post('/auth/change-password/', data),
  deleteAccount: () => API.delete('/auth/delete-account/'),
  
  setup2FA: () => API.get('/auth/admin/2fa/setup/'),
  verifySetup2FA: (data) => API.post('/auth/admin/2fa/verify-setup/', data),
  getLoginActivity: () => API.get('/auth/admin/login-activity/'),
};

export const servicesAPI = {
  getCategories: () => API.get('/services/categories/'),
  getCategory: (id) => API.get(`/services/categories/${id}/`),
  createCategory: (data) => API.post('/services/categories/', data),
  updateCategory: (id, data) => API.patch(`/services/categories/${id}/`, data),
  deleteCategory: (id) => API.delete(`/services/categories/${id}/`),
  getSubcategories: (categoryId) => {
    const params = categoryId ? { category: categoryId } : {};
    return API.get('/services/subcategories/', { params });
  },
  getSubcategory: (id) => API.get(`/services/subcategories/${id}/`),
  createSubcategory: (data) => API.post('/services/subcategories/', data),
  updateSubcategory: (id, data) => API.patch(`/services/subcategories/${id}/`, data),
  deleteSubcategory: (id) => API.delete(`/services/subcategories/${id}/`),
  getProvidersBySubcategory: (id, params) => API.get(`/services/subcategories/${id}/providers/`, { params }),
  search: (q) => API.get('/services/search/', { params: { q } }),
  getMyServices: () => API.get('/services/my-services/'),
  addMyService: (data) => API.post('/services/my-services/', data),
};

export const bookingsAPI = {
  getBookings: (params) => API.get('/bookings/', { params }),
  getBooking: (id) => API.get(`/bookings/${id}/`),
  createBooking: (data) => API.post('/bookings/', data),
  updateStatus: (id, data) => API.post(`/bookings/${id}/status/`, data),
  createEmergency: (data) => API.post('/bookings/emergency/', data),
  getEmergencies: () => API.get('/bookings/emergency/list/'),
  getAnalytics: () => API.get('/bookings/analytics/'),
};

export const reviewsAPI = {
  getReviews: (params) => API.get('/reviews/', { params }),
  createReview: (data) => API.post('/reviews/', data),
  getProviderReviews: (providerId) => API.get(`/reviews/provider/${providerId}/`),
  getAnalytics: () => API.get('/reviews/analytics/'),
};

export const notificationsAPI = {
  getNotifications: (params) => API.get('/notifications/notifications/', { params }),
  getUnreadCount: () => API.get('/notifications/notifications/unread_count/'),
  getAdminSummary: () => API.get('/notifications/notifications/admin_summary/'),
  markAsRead: (id) => API.patch(`/notifications/notifications/${id}/mark_read/`),
  markAllAsRead: () => API.patch('/notifications/notifications/mark_all_read/'),
  deleteNotification: (id) => API.delete(`/notifications/notifications/${id}/delete_notification/`),
  getPreferences: () => API.get('/notifications/preferences/'),
  updatePreferences: (data) => API.put('/notifications/preferences/', data),
};

export const chatbotAPI = {
  sendMessage: (data) => API.post('/chatbot/', data),
  getHistory: (sessionKey) => API.get(`/chatbot/history/${sessionKey}/`),
  getSessions: () => API.get('/chatbot/sessions/'),
};

export const paymentsAPI = {
  initiateCommission: (data) => API.post('/payments/payments/initiate-commission/', data),
  verifyCommission: (data) => API.post('/payments/payments/verify-commission/', data),
};

export const payoutsAPI = {
  initiatePayout: (id) => API.post(`/payments/payouts/${id}/initiate/`),
};

export default API;
