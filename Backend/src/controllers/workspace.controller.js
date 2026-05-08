import { Workspace } from "../models/workspace.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"

export const createWorkspace = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    if(!name){
        throw new ApiErrors(400,"Workspace name is needed")
    }
    
    const createdWorkspace= await Workspace.create({
        name,
        description,
        owner: req.user._id,
        participants: [req.user._id]
    })
    if(!createdWorkspace){
        throw new ApiErrors(500,"somthign went wrong while making workspace")
    }

    res.status(201) 
    .json(
        new ApiResponse(201,createdWorkspace,"Workspace Created successfully")
    )
})

//this will be shown in dashboard
export const getUserWorkspaces = asyncHandler(async (req, res) => {
    const workspaces = await Workspace.find({participants:req.user._id})

    res.status(200) 
    .json(
        new ApiResponse(200,workspaces,"Workspace fetched")
    )
})

//after clicking specific workspace
export const  getWorkspaceById = asyncHandler( async (req,res)=>{
    const {workspaceId}= req.params

    const workspace= await Workspace.findOne({ _id: workspaceId, participants: req.user._id })
    if(!workspace){
        throw new ApiErrors(404,"Workspace not found or unauthroised")
    }

    res.status(200) 
    .json(
        new ApiResponse(200,workspace,"Workspace fetched")
    )
})


