import axios from "axios"  

const API_URL = "/api/v1/problems"  

/**
 * Calls backend to generate a problem via Gemini AI
 * @param {string} problemName - The topic or algorithm name (e.g., "Two Sum")
 * @returns {Object} { statusCode, data: { _id, statement, boilerplates, testCases, ... }, message }
 */
export const generateProblem = async (problemName) => {
        const response = await axios.post(
            `${API_URL}/generate`,
            { problemName },
            { withCredentials: true }
        )  
        return response.data   // ApiResponse wrapper
   
}   