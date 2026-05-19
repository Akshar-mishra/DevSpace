import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Problem } from "../models/problem.model.js"
import { generateProblemPayload } from "../services/gemini.service.js"

export const createProblem = asyncHandler( async (req,res)=>{
    const {problemName} = req.body
    if(!problemName || problemName.trim() === ""){
        throw new ApiErrors(400,"Problem name is req")
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
})