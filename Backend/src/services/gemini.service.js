import { GoogleGenAI } from "@google/genai";

// 1. Initialize the Google Gen AI client
// It will automatically pick up process.env.GEMINI_API_KEY if no arguments are passed, 
// but we explicitly pass it for clarity.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Calls Gemini to generate a structured algorithm problem.
 * @param {string} problemName - The topic or name typed by the Interviewer.
 * @returns {Object} Parsed JSON matching the Problem mongoose schema.
 */
export const generateProblemPayload = async (problemName) => {
    
    // 2. The Strict System Instruction (Prompt Engineering)
    const prompt = `
    You are a strict technical problem generator for a mock interview platform.
    Your task is to generate a programming problem based on the user's input: "${problemName}".
    
    CRITICAL RULE: If the user input is not a recognizable data structure, algorithm, or programming concept, ignore it and generate the classic "Two Sum" problem instead.
    
    You MUST return ONLY a raw JSON object. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). Do not add any conversational text. 
    
    The JSON object MUST exactly match the following schema:
    {
      "title": "String (A clean, professional title of the problem)",
      "statement": "String (A clear, detailed description of the problem, including what needs to be returned)",
      "difficulty": "String (Must be exactly one of: 'Easy', 'Medium', 'Hard')",
      "constraints": [
        "String (e.g., '2 <= nums.length <= 10^4')"
      ],
      "examples": [
        {
          "input": "String (e.g., 'nums = [2,7,11,15], target = 9')",
          "output": "String (e.g., '[0,1]')",
          "explanation": "String (Optional. Explain how the output is reached.)"
        }
      ],
      "testCases": [
        {
          "input": "String (Strictly formatted input string for Judge0 to parse)",
          "expectedOutput": "String (Strictly formatted expected output string)"
        }
      ],
      "boilerplates": {
        "cpp": "String (Starting code block with the class/function signature for C++)",
        "java": "String (Starting code block with the class/function signature for Java)",
        "python": "String (Starting code block with the class/function signature for Python3)"
      }
    }
    
    Ensure you provide at least 2 examples and at least 5 hidden testCases.
    The boilerplates must just be the starter code (like LeetCode), not the full solution.
    `;

    try {
        // 3. Network Call to Gemini
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Fast, highly capable model
            contents: prompt,
            config: {
                responseMimeType: "application/json", // Forces pure JSON output
                temperature: 0.0, // Enforces determinism; prevents creative hallucinations
            }
        });

        // 4. Parse and return the payload
        const rawJsonString = response.text;
        const problemData = JSON.parse(rawJsonString);
        
        return problemData;
        
    } catch (error) {
        console.error("Gemini Service Error:", error);
        throw new Error("Failed to generate problem from AI Engine.");
    }
};