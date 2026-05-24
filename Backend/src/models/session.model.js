import mongoose,{Schema} from "mongoose"
import { Room } from "./room.model.js"
import { User } from "./user.model.js"

const sessionSchema = new Schema(
    {
        room: {
            type: Schema.Types.ObjectId,
            ref: "Room",
            required: true
        },
        interviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        candidate: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        codeSnapshots: [
            {
                problem: Schema.Types.ObjectId, 
                language: String, 
                code: String
            }
        ],

        // Hints given by interviewer (optional, for later)
        // hintsGiven: [String],
        startedAt: {
            type: Date,
            default: Date.now
        },
        endedAt: {
            type: Date
        },

        // Summary after session ends (optional for now)
        // summary: {
        //     timeSpent: Number,
        //     runCount: Number,
        //     hintCount: Number
        // }
    },
    { timestamps: true }
);

export const Session = mongoose.model("Session",sessionSchema)