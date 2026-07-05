import { Router } from "express"  
import { loginUser, logoutUser, refreshAccessToken, registerUser, getCurrentUser,forgotPassword, verifyOtp,resetPassword} from "../controllers/user.controller.js"  
import { verifyJWT } from "../middlewares/auth.middleware.js"  
import { otpRateLimiter } from "../middlewares/rateLimiter.middleware.js"



const router= Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)  
router.route("/me").get(verifyJWT, getCurrentUser)  
router.route("/reset-password").post(resetPassword)
router.route("/forgot-password").post(otpRateLimiter, forgotPassword)
router.route("/verify-otp").post(otpRateLimiter, verifyOtp)
export default router 