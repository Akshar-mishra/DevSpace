import { Room } from "../models/room.model.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import crypto from "crypto"

export const createRoom = asyncHandler(async (req, res) => {
    // 1. Extract the expanded payload required by the Master Blueprint
    const { name, type, mode, isPublic, maxParticipants } = req.body

    // 2. Strict Enums Validation
    if (!name || !type) {
        throw new ApiErrors(400, "Room name and type are required");
    }

    if (type === 'friendly_room' && !mode) {
        throw new ApiErrors(400, "Friendly rooms require a mode (compete or collab)");
    }

    // 3. Invite Link Generation Mechanics (Cryptographically secure 8-character string)
    const inviteLink = crypto.randomBytes(4).toString("hex");

    // 4. Database Seed with Relational Anchors
    const room = await Room.create({
        name,
        type,
        mode,
        isPublic: isPublic || false,
        maxParticipants: maxParticipants || 2,
        inviteLink,
        createdBy: req.user._id,
        participants: [req.user._id] // Instantly authorize the creator
    });

    if (!room) {
        throw new ApiErrors(500, "Failed to create room");
    }

    res.status(201).json(
        new ApiResponse(201, room, "Room created successfully")
    );
});

export const getUserRooms = asyncHandler(async (req, res) => {
    // Queries all rooms where the user holds a slot in the participants array
    const rooms = await Room.find({ participants: req.user._id });

    res.status(200).json(
        new ApiResponse(200, rooms, "Rooms fetched successfully")
    );
});

export const getRoomById = asyncHandler(async (req, res) => {
    const { roomId } = req.params;

    // Secure fetch: Validates Room ID AND verifies the requester is an authorized participant
    const room = await Room.findOne({ _id: roomId, participants: req.user._id });

    if (!room) {
        throw new ApiErrors(404, "Room not found or unauthorized");
    }

    res.status(200).json(
        new ApiResponse(200, room, "Room fetched successfully")
    );
});

export const joinRoom = asyncHandler(async (req, res) => {
    const { inviteLink } = req.body;

    if (!inviteLink) {
        throw new ApiErrors(400, "Invite link is required");
    }

    const room = await Room.findOne({ inviteLink });

    if (!room) {
        throw new ApiErrors(404, "Invalid invite link or room does not exist");
    }

    // Check if user is already a participant
    if (room.participants.includes(req.user._id)) {
        return res.status(200).json(
            new ApiResponse(200, room, "You are already in this room")
        );
    }

    // Check capacity
    if (room.participants.length >= room.maxParticipants) {
        throw new ApiErrors(400, "Room is full");
    }

    // Add user to room
    room.participants.push(req.user._id);
    await room.save();

    res.status(200).json(
        new ApiResponse(200, room, "Successfully joined the room")
    );
});