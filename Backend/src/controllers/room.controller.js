import { Problem } from "../models/problem.model.js"
import { Room } from "../models/room.model.js"
import { Session } from "../models/session.model.js"
import { generateProblemPayload } from "../services/ai.service.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import crypto from "crypto"

export const createRoom = asyncHandler(async (req, res) => {
    const { name, type, mode, isPublic, maxParticipants } = req.body
    if (!name || !type) {
        throw new ApiErrors(400, "Room name and type are required")  
    }
    if (type === 'interview_room' && req.user.role !== 'interviewer') {
        throw new ApiErrors(403, "Only interviewers can create interview rooms")
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

    return res.status(201)
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
        .populate("participants", "name email role")
        .populate("problems")  
    
    if (!room) throw new ApiErrors(404, "Room not found or has been deleted")

    const roomObj = room.toObject()
    if (req.user.role === "member") {
        roomObj.problems = roomObj.problems.map((prob, index) => ({
            ...prob,
            title: `Problem ${index + 1}`
        }))
    }
    return res.status(200)
    .json(
        new ApiResponse(200, roomObj, "Room data fetched successfully"
    ))  
})

export const getMyRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({ participants: req.user._id })
        .populate("createdBy", "name email")
        .sort({ updatedAt: -1 })  

    return res.status(200)
    .json(
        new ApiResponse(200, rooms, "Rooms fetched successfully")
    )  
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

    const isParticipant = room.participants.some(p => p.equals(req.user._id))  
    if (!isParticipant) {
        throw new ApiErrors(403, "Only room participants can add problems")  
    }

    // Escape special characters so users can't crash your DB with regex symbols
    const safeSearchTerm = problemName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')  
    
    // Search anywhere in the title, case-insensitive (removed ^ and $)
    let problem = await Problem.findOne({ 
        title: { $regex: new RegExp(safeSearchTerm, "i") } 
    })     

    if (!problem) {
        console.log(`[AI Triggered] Generating new problem: "${problemName}"...`)     
        const problemData = await generateProblemPayload(problemName)     
        if (!problemData || !problemData.boilerplates) {
            throw new ApiErrors(500, "Failed to generate problem via AI")     
        }
        try {
            console.log("\n[AI Success] Raw Data received:", JSON.stringify(problemData, null, 2))
            problem = await Problem.create({
                ...problemData, 
                generatedBy: req.user._id,
                createdBy: req.user._id
            })
            console.log("[DB Success] Problem saved to database!")
        } catch (dbError) {
            console.error("\n❌ MONGOOSE VALIDATION ERROR ❌")   
            console.error(dbError.message)    
            throw new ApiErrors(500, `Database Validation Failed: ${dbError.message}`)   
        }
    } 
    else {
        console.log(`[Cache Hit] Problem "${problem.title}" loaded instantly from DB!`)     
    }

    if (!room.problems) {
        room.problems = []     
    }

    const problemExistsInRoom = room.problems.some(
        (id) => id.toString() === problem._id.toString()
    )  
    if (!problemExistsInRoom) {
        room.problems.push(problem._id)     
        await room.save({ validateBeforeSave: false })     
    }

    const updatedRoom = await Room.findById(roomId).populate("problems") 

    const roomObj = updatedRoom.toObject()

    if (req.user.role === "member") {
        roomObj.problems = roomObj.problems.map((prob, index) => ({
            ...prob,
            title: `Problem ${index + 1}`
        }))
    }
    
    return res.status(201)
    .json(
        new ApiResponse(201, roomObj, "Problem added to room successfully")
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
    
    const candidateId = room.participants.find(pId => pId.toString() !== req.user._id.toString())  

    // Transform the frontend cache into the schema array format
    let snapshots = []  
    if (finalCache && typeof finalCache === 'object') {
        for (const [probId, languages] of Object.entries(finalCache)) {
            for (const [lang, codeStr] of Object.entries(languages)) {
                snapshots.push({
                    problem: probId,
                    language: lang,
                    code: codeStr
                })  
            }
        }
    }

    const session = await Session.create({
        room: roomId,
        interviewer: req.user._id,
        candidate: candidateId,
        codeSnapshots: snapshots, 
        interviewerNotes: interviewerNotes,
        endedAt: Date.now()
    })  

    room.status = 'ended'  
    room.endedAt = Date.now()  
    await room.save({ validateBeforeSave: false })  

    return res.status(200)
    .json(
        new ApiResponse(200, { room, sessionId: session._id }, "Session ended securely")
    )  
})