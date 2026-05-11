import api from './api';

export const setupAxiosInterceptors = (setUser) => {
    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // If 401 AND haven't retried yet
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    // Try to refresh the access token
                    await api.post('/users/refresh-token');
                    // Retry the original request
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, logout user
                    setUser(null);
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
};