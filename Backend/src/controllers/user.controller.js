import { User } from "../models/user.model.js"  
import { ApiErrors } from "../utils/ApiErrors.js"  
import { ApiResponse } from "../utils/ApiResponse.js"  
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"  
import bcrypt from "bcryptjs"
import crypto from "crypto"
import {sendNotification} from "../services/notify.service.js"

export const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)  

        const accessToken = user.generateAccessToken()  
        const refreshToken = user.generateRefreshToken()  
        //inside schema wala refreshToken
        user.refreshToken = refreshToken  

        await user.save({ validateBeforeSave: false })  

        return { accessToken, refreshToken }  
    } catch (err) {
        console.error("TOKEN ERROR:", err)  
        throw err  
    }
}

export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body  
    if ([name, email, password].some((field) => !field || field.trim() === "")) {
        throw new ApiErrors(400, "All Fields Are Required")
    }

    const existingUser = await User.findOne({email})
    if (existingUser) {
        throw new ApiErrors(400, "Email already exists")
    }

    const user = await User.create({
        name,
        email,
        password,
        role: role.toLowerCase() || "member"
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
        secure: true,
        sameSite: "none"
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken },
                "User loggedin successfully"
            )
        )
})

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    const user = await User.findOne({ email }) 
    if (!user) {
        throw new ApiErrors(404, "User not found") 
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    const hashedOtp = await bcrypt.hash(otp, 10)

    // 3. set expiry — 5 min from now
    user.otp =  hashedOtp
    user.otpExpiry = Date.now() + 600000  // hint: Date.now() + ___

    await user.save({ validateBeforeSave: false }) 

    // 4. call notify service
    await sendNotification({
        to: user.email,
        subject:"Password Reset OTP",
        body: `Your OTP is ${otp}`
    }) 

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "OTP sent")
    ) 
}) 

export const verifyOtp = asyncHandler(async(req,res)=>{
    const {email,otp}= req.body

    const user = await User.findOne({email})
    if(!user){
        throw new ApiErrors(404,"User not found")
    }

    if (!user.otp || user.otpExpiry < Date.now()) {
        throw new ApiErrors(400, "OTP is invalid or expired")
    }

    const isValid = await bcrypt.compare(otp, user.otp)
    if (!isValid) throw new ApiErrors(400, "Invalid OTP")

    user.otp = null
    user.otpExpiry = null

    const resetToken = jwt.sign(
                        { _id: user._id },
                        process.env.RESET_TOKEN_SECRET,
                        { expiresIn: '10m' }
                        )

    await user.save({ validateBeforeSave: false })

    return res.status(200)
    .json(
        new ApiResponse(200, {resetToken}, "OTP verified successfully")
    )
})

export const resetPassword =asyncHandler(async(req,res)=>{
    const {resetToken,newPassword}= req.body
    if(!resetToken || !newPassword){
        throw new ApiErrors(400, "Missing required fields")
    }
    
    let decoded
    try {
        decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET)
    } catch (err) {
        throw new ApiErrors(401, "Reset token invalid or expired")
    }
    
    const user =await User.findById(decoded._id)
    if(!user){
        throw new ApiErrors(404,"User not found")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200)
    .json(
        new ApiResponse(200,{}, "Password reset successfully")
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
        secure: true,
        sameSite: "none"
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "User logged out successfully")
    )
})

export const refreshAccessToken = asyncHandler( async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken ||  req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiErrors(401, "Unauthorized Request")
    }
    
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)  
    if (!user) {
        throw new ApiErrors(401, "Invalid Refresh Token")
    }


    if (incomingRefreshToken !== user?.refreshToken) {   //the reftoken is from generate acc n re toekn
        throw new ApiErrors(401, "Refresh token is used or expired")
    }

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    }
    
    const  { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Access Token Refreshed"
            )
        )
})

export const getCurrentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password -refreshToken")  
    
    if (!user) {
        throw new ApiErrors(404, "User not found")  
    }

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Current user fetched successfully")
    )  
})   