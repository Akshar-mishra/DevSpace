import mongoose,{Schema} from "mongoose"
import { Room } from "./room.model.js"
import { User } from "./user.model.js"

const sessionSchema = new Schema(
    {
        room: {
            type: Schema.Types.ObjectId,
            ref: "Room",
            required: true,
            index:true
        },
        interviewer: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index:true
        },
        candidate: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index:true
        },
        interviewerNotes: {
            type: String,
            default: ""
        },
        feedback:{
                communication:{
                    type:Number,
                    min:1,
                    max:5
                },
                problemSolving:{
                    type:Number,
                    min:1,
                    max:5
                },
                codeQuality:{
                    type:Number,
                    min:1,
                    max:5
                },
                overall:{
                    type:Number,
                    min:1,
                    max:5 
                },
                comments:String
            },
        codeSnapshots: [
            {
                problem: Schema.Types.ObjectId, 
                language: String, 
                code: String
            }
        ],
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
)  

export const Session = mongoose.model("Session",sessionSchema)