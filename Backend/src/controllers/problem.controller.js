import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Problem } from "../models/problem.model.js"
import { generateProblemPayload } from "../services/gemini.service.js"

/*
export const createProblem = asyncHandler( async (req,res)=>{
    const {problemName} = req.body
    if(!problemName || problemName.trim() === ""){
        throw new ApiErrors(400,"Problem name is req")
    }

    if (!req.user || !req.user._id) {
        throw new ApiErrors(401, "User not authenticated");
    }

    const problemData = await generateProblemPayload(problemName);
    if (!problemData || !problemData.boilerplates || !problemData.testCases) {
        throw new ApiErrors(500, "AI Engine returned an incomplete problem structure.");
    }

    const problem= await Problem.create({
        ...problemData,
        generatedBy:req.user._id
    })
    if (!problem) {
         throw new ApiErrors(500, "Failed to save the generated problem to the database");
    }

    return res.status(200)
    .json(
        new ApiResponse(200,problem,"problem generated success")
    )
})  */

    export const createProblem = asyncHandler(async (req,res)=>{
    const {problemName} = req.body
    if(!problemName || problemName.trim() === ""){
        throw new ApiErrors(400,"Problem name is req")
    }

    // ✅ MOCK PROBLEM FOR TESTING (remove later)
    const mockProblem = {
        title: "Two Sum",
        statement: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
        difficulty: "Easy",
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
        examples: [
            {
                input: "nums = [2,7,11,15], target = 9",
                output: "[0,1]",
                explanation: "nums[0] + nums[1] == 9, so we return [0, 1]."
            }
        ],
        testCases: [
            { input: "2 7\n9", expectedOutput: "0 1" },
            { input: "3 2 4\n6", expectedOutput: "1 2" }
        ],
        boilerplates: {
            cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};",
            java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[2];\n    }\n}",
            python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        return []"
        }
    }

    const problem = await Problem.create({
        ...mockProblem,
        generatedBy: req.user._id
    })

    return res.status(200).json(
        new ApiResponse(200, problem, "Mock problem created for testing")
    )
})
/*
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Problem } from "../models/problem.model.js"

export const createProblem = asyncHandler(async (req,res)=>{
    const {problemName} = req.body
    if(!problemName || problemName.trim() === ""){
        throw new ApiErrors(400,"Problem name is req")
    }

    // ✅ MOCK PROBLEM FOR TESTING
    const mockProblem = {
        title: "Two Sum",
        statement: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nYou may assume each input has exactly one solution, and you cannot use the same element twice.",
        difficulty: "Easy",
        constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
        examples: [
            {
                input: "nums = [2,7,11,15], target = 9",
                output: "[0,1]",
                explanation: "nums[0] + nums[1] == 9, so we return [0, 1]."
            },
            {
                input: "nums = [3,2,4], target = 6",
                output: "[1,2]",
                explanation: "nums[1] + nums[2] == 6, so we return [1, 2]."
            }
        ],
        testCases: [
            { 
                input: "[2,7,11,15]\n9", 
                expectedOutput: "[0,1]" 
            },
            { 
                input: "[3,2,4]\n6", 
                expectedOutput: "[1,2]" 
            },
            { 
                input: "[3,3]\n6", 
                expectedOutput: "[0,1]" 
            }
        ],
        boilerplates: {
            cpp: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};",
            java: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[2];\n    }\n}",
            python: "from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        return []"
        }
    }

    const problem = await Problem.create({
        ...mockProblem,
        generatedBy: req.user._id
    })

    return res.status(200).json(
        new ApiResponse(200, problem, "Mock problem created for testing")
    )
})*/