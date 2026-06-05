import api from './api'  

export const submitSessionFeedback = async (sessionId, feedbackData) => {
    const response = await api.put(`/sessions/${sessionId}/feedback`, feedbackData)  
    return response.data  
}

export const getMySessions = async () => {
    const response = await api.get("/sessions/my-sessions")  
    return response.data  
}

export const deleteSession = async (sessionId) => {
    const response = await api.delete(`/sessions/${sessionId}`);  
    return response.data;  
} 