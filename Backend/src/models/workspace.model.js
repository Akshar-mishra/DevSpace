import mongoose, {model, Schema} from "mongoose";

const workspaceSchema= new Schema(
    {
        name:{
            type:String,
            required:[true, "Workspace name is required"],
            trim:true
        },
        description:{
            type:String,
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        participants:[      //as multiple user wil join here
            {
                type: Schema.Types.ObjectId,
                ref:"User",
            }
        ]    


    },{timestamps:true}
)

export const Workspace = mongoose.model('Workspace',workspaceSchema)