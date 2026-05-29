import { Problem } from "../models/problem.model.js"
import { Room } from "../models/room.model.js"
import { Session } from "../models/session.model.js"
import { generateProblemPayload } from "../services/ai.service.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import crypto from "crypto"
import { roomCodeState } from "../socket/index.js"  

export const createRoom = asyncHandler(async (req, res) => {
    const { name, type, mode, isPublic, maxParticipants } = req.body

    if (!name || !type) {
        throw new ApiErrors(400, "Room name and type are required")  
    }

    const inviteLink = crypto.randomBytes(4).toString("hex")  

    const room = await Room.create({
        name,
        type,
        isPublic: isPublic || false,
        maxParticipants: maxParticipants || 2,
        inviteLink,
        createdBy: req.user._id,
        participants: [req.user._id]
    })  

    if (!room) throw new ApiErrors(500, "Failed to create room")  

    res.status(201)
    .json(
        new ApiResponse(201, room, "Room created successfully")
    )  
})  

export const joinRoom = asyncHandler(async (req, res) => {
    const { inviteLink } = req.params  

    if (!inviteLink){
        throw new ApiErrors(400, "Invite link is required")  
    }

    const room = await Room.findOne({ inviteLink })  
    if (!room){
        throw new ApiErrors(404, "Invalid invite link or room does not exist")  
    }
    
    if (room.status === 'ended') throw new ApiErrors(403, "This session has already ended.")  

    if (room.participants.some(id => id.equals(req.user._id))) {
        return res.status(200).json(new ApiResponse(200, room, "You are already in this room"))  
    }

    if (room.participants.length >= room.maxParticipants) {
        throw new ApiErrors(400, "Room is full")  
    }

    room.participants.push(req.user._id)  
    await room.save({ validateBeforeSave: false })  

    res.status(200)
    .json(
        new ApiResponse(200, room, "Successfully joined the room")
    )  
})  


export const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params  

    const room = await Room.findById(id)
        .populate("participants", "name email role isOnline")
        .populate("problems")  
    
    if (!room) throw new ApiErrors(404, "Room not found or has been deleted")  

    return res.status(200).json(new ApiResponse(200, room, "Room data fetched successfully"))  
})  

export const getMyRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({ participants: req.user._id })
        .populate("createdBy", "name email")
        .sort({ updatedAt: -1 })  

    return res.status(200).json(new ApiResponse(200, rooms, "Rooms fetched successfully"))  
})  


export const addProblemToRoom = asyncHandler(async (req, res) => {
    const { roomId } = req.params   
    const { problemName } = req.body   
    
    if (!problemName || problemName.trim() === "") {
        throw new ApiErrors(400, "Problem name is required")   
    }

    const room = await Room.findById(roomId)   
    if (!room) {
        throw new ApiErrors(404, "Room not found")   
    }

    if (!room.createdBy.equals(req.user._id)) {
        throw new ApiErrors(403, "Only room creator can add problems")   
    }

    // 1. Search the DB for an exact match
    let problem = await Problem.findOne({ 
        title: { $regex: new RegExp(`^${problemName.trim()}$`, "i") } 
    })   

    // 2. Generate if not found
    if (!problem) {
        console.log(`[AI Triggered] Generating new problem: "${problemName}"...`)   
        const problemData = await generateProblemPayload(problemName)   
        
        if (!problemData || !problemData.boilerplates) {
            throw new ApiErrors(500, "Failed to generate problem via AI")   
        }

        // 🚨 THE FIX: Catch Mongoose specifically and log the exact schema violation
        try {
            // Log the raw AI data so you can see exactly what Gemini returned
            console.log("\n[AI Success] Raw Data received:", JSON.stringify(problemData, null, 2)) 

            problem = await Problem.create({
                ...problemData, 
                generatedBy: req.user._id,
                createdBy: req.user._id // Adding this as Mongoose likely requires it!
            }) 
            console.log("[DB Success] Problem saved to database!") 

        } catch (dbError) {
            console.error("\n❌ MONGOOSE VALIDATION ERROR ❌") 
            console.error(dbError.message)  // This will tell you exactly which field failed!
            throw new ApiErrors(500, `Database Validation Failed: ${dbError.message}`) 
        }
        
    } else {
        console.log(`[Cache Hit] Problem "${problemName}" loaded instantly from DB!`)   
    }

    // 3. Add to the room
    if (!room.problems) {
        room.problems = []   
    }

    if (!room.problems.includes(problem._id)) {
        room.problems.push(problem._id)   
        await room.save({ validateBeforeSave: false })   
    }

    const updatedRoom = await Room.findById(roomId).populate("problems")   
    
    return res.status(201).json(
        new ApiResponse(201, updatedRoom, "Problem added to room successfully")
    )   
}) 
export const deleteRoom = asyncHandler(async (req, res) => {
    const {roomId} = req.params
    const room = await Room.findById(roomId)
    if (!room) {
        throw new ApiErrors(404, "Room not found")
    }

    if (!room.createdBy.equals(req.user._id)) {
        throw new ApiErrors(403, "Only room creator can delete")
    }

    await Room.findByIdAndDelete(roomId)
    await Session.deleteMany({room:roomId})

    return res.status(200)
    .json(
        new ApiResponse(200, null, "Room deleted successfully")
    )

})

export const endRoomSession = asyncHandler(async (req, res) => {
    const { roomId } = req.params  
    const { finalCache, interviewerNotes } = req.body   

    const room = await Room.findById(roomId)  
    if (!room) throw new ApiErrors(404, "Room not found")  
    
    // ... (Your existing participant finding logic) ...
    const candidateId = room.participants.find(pId => pId.toString() !== req.user._id.toString())  

    // 🚨 THIS IS THE FIX: Capture the return value of Session.create
    const session = await Session.create({
        room: roomId,
        interviewer: req.user._id,
        candidate: candidateId,
        codeSnapshots: [], // Add your snapshot logic here
        interviewerNotes: interviewerNotes,
        endedAt: Date.now()
    })  

    room.status = 'ended'  
    room.endedAt = Date.now()  
    await room.save({ validateBeforeSave: false })  

    // NOW 'session' is defined, and this will work:
    return res.status(200).json(
        new ApiResponse(200, { room, sessionId: session._id }, "Session ended securely")
    )  
})  