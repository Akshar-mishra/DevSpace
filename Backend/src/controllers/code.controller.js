import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Room } from "../models/room.model.js"

export const submitCode= asyncHandler( async(req,res)=>{
    const {roomId, languageId , sourceCode, problemId}= req.body
    if(!roomId || !languageId || !sourceCode || !problemId){
        throw new ApiErrors(400,"Missing required fields: roomId, languageId, sourceCode, or problemId")
    }

    const room = await Room.findById(roomId).populate("problems")
    if(!room){
        throw new ApiErrors(404, "Room not found")
    }

    const problem = room.problems.find(p => p._id.toString() === problemId)
    if (!problem) {
        throw new ApiErrors(400, "Problem not found in this room")
    }

    if (room.status === 'ended') {
        throw new ApiErrors(403, "Session has ended. Execution is locked.")
    }

    const testCases = problem.testCases
    const executionResults = await executeBatch(sourceCode, languageId, testCases)

    return res.status(200).json(
        new ApiResponse(200, executionResults, "Execution completed successfully")
    )

})