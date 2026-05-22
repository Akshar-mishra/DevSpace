import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Room } from "../models/room.model.js"
import { executeBatch } from "../services/piston.service.js"

export const submitCode= asyncHandler( async(req,res)=>{
    const {roomId, languageId , sourceCode}= req.body
    if(!roomId || !languageId || !sourceCode){
        throw new ApiErrors(400,"Missing required fields: roomId, languageId, or sourceCode")
    }

    const room = await Room.findById(roomId).populate("problem")
    if(!room){
        throw new ApiErrors(404, "Room not found")
    }
    if (!room.problem) {
        throw new ApiErrors(400, "No problem assigned to this room yet. Generate a problem first.");
    }
    if (room.status === 'ended') {
        throw new ApiErrors(403, "Session has ended. Execution is locked.");
    }

    const testCases = room.problem.testCases
    const executionResults = await executeBatch(sourceCode, languageId, testCases)

    return res.status(200)
    .json(
        new ApiResponse(200, executionResults, "Execution completed successfully")
    )

})