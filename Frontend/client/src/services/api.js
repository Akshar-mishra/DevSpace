import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1', // Ensure this matches your backend port
    withCredentials: true, // STRICTLY REQUIRED FOR COOKIES
});

export default api;