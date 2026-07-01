import Groq from "groq-sdk";
import { ApiErrors } from "../utils/ApiErrors.js";

const groq = new Groq();

export const generateProblemPayload = async (problemName) => {
    
    const prompt = `
    You are a strict technical problem generator for a mock interview platform.
    Generate a programming problem based on: "${problemName}".
    If the input is not a recognizable programming concept, generate the classic "Two Sum" problem.
    
    CRITICAL INSTRUCTION FOR PROBLEM STATEMENT:
    The problem statement MUST be highly detailed, rigorous, and professional, exactly like a LeetCode problem. 
    It must include a clear backstory/scenario, exact algorithmic objectives, and a thorough explanation of the expected behavior. 
    Do not use one-liners. Write a deep, 2-3 paragraph description.
    
    You MUST return ONLY a raw JSON object matching this exact schema. Do not wrap it in markdown.
    {
      "title": "String",
      "statement": "String (Contains the highly detailed 2-3 paragraph LeetCode-style description)",
      "difficulty": "String (Easy, Medium, Hard)",
      "constraints": ["String"],
      "examples": [{"input": "String", "output": "String", "explanation": "String"}],
      IMPORTANT:
      testCases MUST be an array of OBJECTS.

      CORRECT:
      "testCases": [
        {
          "input": "4 8\n3 6 7 11",
          "expectedOutput": "4"
        }
      ]
      
      WRONG:
      "testCases": [
        "4 8\n3 6 7 11"
      ]

      Every test case object MUST contain BOTH:
      - input
      - expectedOutput

      Never return testCases as strings.
            "boilerplates": {
              "cpp": "String (Executable C++ template. MUST include #includes, an EMPTY logic function (e.g. return 0/empty vector), and int main() that parses stdin and prints stdout. DO NOT SOLVE THE PROBLEM.)",
              "java": "String (Executable Java template. MUST include imports, an EMPTY logic method (e.g. return null), and public static void main parsing System.in. DO NOT SOLVE THE PROBLEM.)",
              "python": "String (Executable Python template. MUST include an EMPTY logic function (just 'pass' or 'return None'), and if __name__ == '__main__': parsing sys.stdin. DO NOT SOLVE THE PROBLEM.)"
            }
          }
    
    🚨 ABSOLUTE STRICT RULE FOR BOILERPLATES 🚨
    YOU MUST NOT WRITE THE ACTUAL SOLUTION LOGIC! 
    Your ONLY job for the boilerplates is to write the standard I/O parsing in the main function. 
    The actual algorithm/logic function MUST remain completely empty (except for a dummy return statement so it compiles). 
    The candidate will write the logic. If you solve the problem for them, you fail your system directive.
    
    Ensure at least 2 examples and 5 hidden testCases.
    `;

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "openai/gpt-oss-120b",
            temperature: 0.0,
            response_format: { type: "json_object" }, 
        });

        const rawJsonString = chatCompletion.choices[0]?.message?.content;
        
        if (!rawJsonString) throw new Error("Empty response from AI");

        return JSON.parse(rawJsonString);

    } catch (error) {
        console.error("🚨 Groq AI Failed (Rate Limit or Network). Triggering Fallback System:", error.message);
        
        throw new Error("AI Engine failed to generate the problem. Please try again later.");
    }
}