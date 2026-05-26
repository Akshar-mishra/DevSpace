
import { ApiErrors } from "../utils/ApiErrors.js"  
import { asyncHandler } from "../utils/asyncHandler.js"  

export const restrictToInterviewer = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiErrors(401, "Unauthorized request")
    }

    if (req.user.role !== "interviewer") { 
        throw new ApiErrors(403, "Forbidden: Only Interviewers can generate problems")
    }
    next()  
})  