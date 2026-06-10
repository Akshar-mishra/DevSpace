import api from './api'  

export const setupAxiosInterceptors = (setUser) => {
    api.interceptors.response.use((response) => response, async (error) => {
        const originalRequest = error.config  
        if (originalRequest.url === '/users/refresh-token') {
            localStorage.removeItem('accessToken')
            setUser(null)  
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login'  
            }
            return Promise.reject(error)  
        }

        // If it's a 401 on any OTHER route, try to refresh the token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true  
            try {
                const response = await api.post('/users/refresh-token')  
                const newToken = response.data.data.accessToken
                localStorage.setItem('accessToken', newToken)
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return api(originalRequest)  
            } catch (refreshError) {
                localStorage.removeItem('accessToken')
                setUser(null)  
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login'  
                }
                return Promise.reject(refreshError)  
            }
        }

        return Promise.reject(error)  
    })   
}  