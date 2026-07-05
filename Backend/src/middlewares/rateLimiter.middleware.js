import rateLimit from 'express-rate-limit'

export const otpRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: "Too many attempts. Please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false
})