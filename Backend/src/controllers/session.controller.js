import {ApiErrors} from "../utils/ApiErrors.js"  
import { ApiResponse } from "../utils/ApiResponse.js"  
import { asyncHandler } from "../utils/asyncHandler.js"  
import { Session } from "../models/session.model.js"  
import { Room } from "../models/room.model.js"
import { User } from "../models/user.model.js"

export const submitFeedback= asyncHandler(async (req, res) => {
    const {sessionId} = req.params
    const{communication,problemSolving ,codeQuality, overall,comments}= req.body
    if(!communication || !comments || !problemSolving || !overall || !codeQuality){
        throw new ApiErrors(400,"enter all details")
    }

    const session = await Session.findById(sessionId)
    if(!session){
        throw new ApiErrors(404,"session not found")
    }

    if(req.user?._id.toString() !== session.interviewer.toString()){
        throw new ApiErrors(403,"only interviewer can submit feedback")
    }

    session.feedback = {
        communication: Number(communication),
        problemSolving: Number(problemSolving),
        codeQuality: Number(codeQuality),
        overall: Number(overall),
        comments: comments.trim()
    }

    await session.save()

    return res.status(200)
    .json(
        new ApiResponse(200, session, "Feedback submitted successfully")
    )
})

export const getMySessions = asyncHandler(async (req, res) => {
    const sessions = await Session.find({
        $or: [{ interviewer: req.user._id }, { candidate: req.user._id }]
    })
    .select("-codeSnapshots")
    .sort({ endedAt: -1 })
    .populate("room", "name type")        
    .populate("interviewer", "name")        
    .populate("candidate", "name")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, sessions, "Sessions fetched successfully")
    )
})

export const getSessionById = asyncHandler(async (req, res) => {
    const { sessionId } = req.params
    const session = await Session.findById(sessionId)
        .populate("room", "name type")        
        .populate("interviewer", "name")        
        .populate("candidate", "name")
    
    if (!session) {
        throw new ApiErrors(404, "Session not found")
    }
    const isInterviewer = req.user?._id.toString() === session.interviewer._id.toString()
    const isCandidate = req.user?._id.toString() === session.candidate._id.toString()

    if (!isInterviewer && !isCandidate) {
        throw new ApiErrors(403, "Access forbidden to this session")
    }

    const sessionObj = session.toObject()
    if (isCandidate) {
        delete sessionObj.interviewerNotes
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, sessionObj, "Session fetched successfully")
    )
})

export const deleteSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId);
    
    if (!session) {
        throw new ApiErrors(404, "Session not found");
    }

    const isParticipant = 
        req.user._id.toString() === session.interviewer.toString() || 
        req.user._id.toString() === session.candidate.toString();

    if (!isParticipant) {
        throw new ApiErrors(403, "Not authorized to delete this session");
    }

    await Session.findByIdAndDelete(sessionId);

    return res.status(200)
    .json(
        new ApiResponse(200, null, "Session history deleted successfully")
    );
});