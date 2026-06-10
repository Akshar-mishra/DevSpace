import axios from 'axios'  

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL + '/api/v1',
    withCredentials: true,
})  

// Add token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

export default api