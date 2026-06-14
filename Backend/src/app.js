import express from 'express'
import cors from "cors"  
import cookieParser from "cookie-parser"  

const app=express()
//added 
const allowedOrigins = [
  'https://dev-space-psi.vercel.app',
  'https://devspace-cplk.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000'
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('CORS not allowed'))
    }
  },
  credentials: true
}))  

app.use(express.urlencoded({extended:true , limit:'16kb'}))
app.use(express.json({limit:'16kb'}))
app.use(cookieParser())  

app.use("/api/v1/check", (req, res) => {
    res.json({ success: true, message: "Backend is running" })
})

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
