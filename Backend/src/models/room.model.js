import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "Room name is required"],
            trim: true
        },
        type: {
            type: String,
            enum: ['interview_room', 'friendly_room'],
            required: [true, "Room type is required"]
        },
        mode: {
            type: String,
            enum: ['compete', 'collab'],
            // Not required because interview_rooms don't use these modes
        },
        status: {
            type: String,
            enum: ['waiting', 'active', 'ended'],
            default: 'waiting'
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        inviteLink: {
            type: String,
            unique: true,
            required: true
        },
        isPublic: {
            type: Boolean,
            default: false
        },
        maxParticipants: {
            type: Number,
            default: 2
        },
        problem: {
            type: Schema.Types.ObjectId,
            ref: "Problem" // We will build this model in Phase 3
        },
        endedAt: {
            type: Date
        }
    },
    { timestamps: true }
);

export const Room = mongoose.model('Room', roomSchema);