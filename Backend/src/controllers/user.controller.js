import { User } from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"

export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        //inside schema wala refreshToken
        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (err) {
        //throw new ApiErrors(401, "Something went wrong while generating tokens");
        console.error("TOKEN ERROR:", err);
        throw err;
    }
}

export const registerUser = asyncHandler(async (req, res) => {

    const { name, email, password } = req.body;
    if ([name, email, password].some((field) => !field || field.trim() === "")) {
        throw new ApiErrors(400, "All Fields Are Required")
    }

    const existingUser = await User.findOne({email})
    if (existingUser) {
        throw new ApiErrors(402, "Username or Email existing")
    }

    const user = await User.create({
        name,
        email,
        password
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiErrors(500, "somthing went wrong while registring user")
    }

    return res.status(201)
    .json(
        new ApiResponse(200,createdUser,"Created User successfully")
    )
})

export const loginUser = asyncHandler( async(req,res)=>{
    
    const {email,password} = req.body
    if(!email || !password ){
        throw new ApiErrors(400, "Enter email or password")
    }

    const user = await User.findOne({email})
    if(!user){
        throw new ApiErrors(404,"User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiErrors(404, "Password Incorrect")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User loggedin successfully"
            )
        )
})

export const logoutUser= asyncHandler( async (req,res)=>{
    //clear ref token frm db
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // This removes the field from the document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))


})

export const refreshAccessToken = asyncHandler( async (req,res)=>{
    
})