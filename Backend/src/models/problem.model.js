import mongoose, { Schema } from "mongoose"  
import { User } from "./user.model.js"  

const problemSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        statement: {
            type: String,
            required: true,
        },
        difficulty: {
            type: String,
            enum: ['Easy', 'Medium', 'Hard'],
            default: 'Medium'
        },
        constraints: [
            {
                type: String
            }
        ],
        examples: [
            {
                input: {
                    type: String,
                    required: true
                },
                output: {
                    type: String,
                    required: true
                },
                explanation: {
                    type: String,
                }
            }
        ],
        testCases: [
            {
                input: {
                    type: String,
                    required: true
                },
                expectedOutput: {
                    type: String,
                    required: true
                }
            }
        ],
        boilerplates: {
            cpp: {
                type: String,
                required: true
            },
            java: { 
                type: String, 
                required: true 
            },
            python: { 
                type: String, 
                required: true 
            }
        },
        generatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    }, { timestamps: true }
)

export const Problem = mongoose.model('Problem', problemSchema)