import axios from "axios";
import { ApiErrors } from "../utils/ApiErrors.js";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

// Create axios instance with timeout
const pistonClient = axios.create({
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json'
    }
});

const getPistonLanguage = (languageId) => {
    const map = {
        54: { language: "cpp", version: "10.2.0" },
        62: { language: "java", version: "15.0.2" },
        71: { language: "python", version: "3.10.0" }
    };
    return map[languageId] || null;
};

// Normalize line endings and trim
const normalize = (str) => (str || "").replace(/\r\n/g, '\n').trim();

export const executeBatch = async (sourceCode, languageId, testCases) => {
    const langConfig = getPistonLanguage(languageId);
    
    if (!langConfig) {
        throw new ApiErrors(400, "Unsupported language ID provided.");
    }

    // If no test cases, return early
    if (!testCases || testCases.length === 0) {
        console.warn("No test cases provided");
        return [];
    }

    const executionPromises = testCases.map(async (tc) => {
        try {
            console.log(`[Piston] Executing for input: ${tc.input?.substring(0, 50)}...`);
            
            const payload = {
                language: langConfig.language,
                version: langConfig.version,
                files: [{ content: sourceCode }],
                stdin: tc.input ? tc.input.trim() : "",
            };

            console.log(`[Piston] Sending request to ${PISTON_URL}`);

            const response = await pistonClient.post(PISTON_URL, payload);
            console.log(`[Piston] Response received:`, response.data);
            
            const { compile, run } = response.data;

            // Guard 1: Compilation Errors
            if (compile && compile.code !== 0) {
                return {
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: compile.stderr || "Compilation failed",
                    passed: false,
                    status: "Compilation Error"
                };
            }

            // Guard 2: Runtime errors
            if (run && run.code !== 0) {
                return {
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: run.stderr || "Runtime error",
                    passed: false,
                    status: "Runtime Error"
                };
            }

            // Guard 3: Time Limit Exceeded
            if (run && run.signal === 'SIGKILL') {
                return {
                    input: tc.input,
                    expectedOutput: tc.output,
                    actualOutput: "Process killed (Infinite Loop / Time Limit Exceeded)",
                    passed: false,
                    status: "TLE"
                };
            }

            const rawActual = run.stdout || "";
            const actualOutput = normalize(rawActual);
            const expectedOutput = normalize(tc.output);
            const passed = actualOutput === expectedOutput;

            return {
                input: tc.input,
                expectedOutput: tc.output,
                actualOutput: rawActual.trim(),
                passed: passed,
                status: passed ? "Pass" : "Fail"
            };

        } catch (error) {
            console.error(`[Piston] Error:`, error.message);
            
            // Better error message
            let errorMsg = "Execution Engine Network Failure";
            if (error.code === 'ECONNREFUSED') {
                errorMsg = "Cannot connect to Piston API";
            } else if (error.code === 'ETIMEDOUT') {
                errorMsg = "Piston API timeout (10s) - server may be down";
            } else if (error.response?.status === 429) {
                errorMsg = "Piston API rate limited - try again later";
            } else if (error.response?.status === 500) {
                errorMsg = "Piston API internal error";
            }
            
            return {
                input: tc.input,
                expectedOutput: tc.output,
                actualOutput: errorMsg,
                passed: false,
                status: "Server Error"
            };
        }
    });

    return await Promise.all(executionPromises);
};