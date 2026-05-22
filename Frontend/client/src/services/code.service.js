import axios from 'axios'

const API_URL = "/api/v1/codes"

export const runCodeService = async (roomId, languageId, sourceCode) => {
    const response = await axios.post(`${API_URL}/run`, {roomId,languageId, sourceCode}, {withCredentials: true })
    return response.data
};