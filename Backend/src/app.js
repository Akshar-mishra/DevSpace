import express from 'express'
import cors from "cors"  
import cookieParser from "cookie-parser"  

const app=express()

app.use(cors({
  origin: process.env.CORS_ORIGINS || "http://localhost:5173", 
  credentials: true
}))  
app.use(express.urlencoded({extended:true , limit:'16kb'}))
app.use(express.json({limit:'16kb'}))
app.use(cookieParser())  


//Routers
import userRouter from "./routes/user.routes.js"
app.use("/api/v1/users",userRouter)

import roomRouter from "./routes/room.routes.js"
app.use("/api/v1/rooms",roomRouter)

import problemRouter from "./routes/problem.routes.js"
app.use("/api/v1/problems", problemRouter)  

import codeRouter from "./routes/code.routes.js"
app.use("/api/v1/codes",codeRouter)

import sessionRouter from "./routes/session.routes.js"
app.use("/api/v1/sessions",sessionRouter)

 
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500  
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error"
    })  
})  
export default app
