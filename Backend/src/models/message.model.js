import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        room: {
            type: Schema.Types.ObjectId,
            ref: "Room",
            required: true,
            index: true   // queried on every chat load
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            type: String,
            required: [true, "Message content is required"],
            trim: true,
            maxlength: [1000, "Message too long"]
        }
    },
    { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);