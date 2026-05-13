import api from './api';

export const setupAxiosInterceptors = (setUser) => {
    api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // PREVENT INFINITE LOOP: If the refresh token route itself fails with 401, 
            // do not try to refresh again. Just log the user out and reject.
            if (originalRequest.url === '/users/refresh-token') {
                setUser(null);
                // Only redirect if not already on login/register to avoid redirect loops
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }

            // If it's a 401 on any OTHER route, try to refresh the token
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    await api.post('/users/refresh-token');
                    return api(originalRequest);
                } catch (refreshError) {
                    setUser(null);
                    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
};