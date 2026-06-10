import axios from 'axios'  

const api = axios.create({
    baseURL:import.meta.env.VITE_BACKEND_URL, //backend port
    withCredentials: true, //REQUIRED FOR COOKIES
})  

export default api  
 