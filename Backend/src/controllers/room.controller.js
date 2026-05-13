import { Room } from "../models/room.model.js"
import { Message } from "../models/message.model.js"
import { ApiErrors } from "../utils/ApiErrors.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import crypto from "crypto"

export const createRoom = asyncHandler(async (req, res) => {
    const { name, type, mode, isPublic, maxParticipants } = req.body

    if (!name || !type) {
        throw new ApiErrors(400, "Room name and type are required");
    }
    if (type === 'friendly_room' && !mode) {
        throw new ApiErrors(400, "Friendly rooms require a mode (compete or collab)");
    }

    const inviteLink = crypto.randomBytes(4).toString("hex");

    const room = await Room.create({
        name,
        type,
        mode: type === 'interview_room' ? undefined : mode,
        isPublic: isPublic || false,
        maxParticipants: maxParticipants || 2,
        inviteLink,
        createdBy: req.user._id,
        participants: [req.user._id]
    });

    if (!room) throw new ApiErrors(500, "Failed to create room");

    res.status(201).json(new ApiResponse(201, room, "Room created successfully"));
});

export const joinRoom = asyncHandler(async (req, res) => {
    const { inviteLink } = req.params;

    if (!inviteLink) throw new ApiErrors(400, "Invite link is required");

    const room = await Room.findOne({ inviteLink });
    if (!room) throw new ApiErrors(404, "Invalid invite link or room does not exist");
    if (room.status === 'ended') throw new ApiErrors(403, "This session has already ended.");

    if (room.participants.some(id => id.equals(req.user._id))) {
        return res.status(200).json(new ApiResponse(200, room, "You are already in this room"));
    }

    if (room.participants.length >= room.maxParticipants) {
        throw new ApiErrors(400, "Room is full");
    }

    room.participants.push(req.user._id);
    await room.save({ validateBeforeSave: false });

    res.status(200).json(new ApiResponse(200, room, "Successfully joined the room"));
});

export const getRoomById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id).populate("participants", "name email role isOnline");
    if (!room) throw new ApiErrors(404, "Room not found or has been deleted");

    return res.status(200).json(new ApiResponse(200, room, "Room data fetched successfully"));
});

export const getMyRooms = asyncHandler(async (req, res) => {
    const rooms = await Room.find({ participants: req.user._id })
        .populate("createdBy", "name email")
        .sort({ updatedAt: -1 });

    return res.status(200).json(new ApiResponse(200, rooms, "Rooms fetched successfully"));
});

// ── Chat history ──────────────────────────────────────────────────────────────
export const getRoomMessages = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const room = await Room.findById(id);
    if (!room) throw new ApiErrors(404, "Room not found");

    const isMember = room.participants.some(p => p.equals(req.user._id));
    if (!isMember) throw new ApiErrors(403, "You are not a participant in this room");

    const messages = await Message.find({ room: id })
        .populate("sender", "name role")
        .sort({ createdAt: 1 })
        .limit(200);

    return res.status(200).json(new ApiResponse(200, messages, "Messages fetched successfully"));
});