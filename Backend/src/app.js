import express from 'express'
import cors from "cors";
import cookieParser from "cookie-parser";


const app=express()

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.urlencoded({extended:true , limit:'16kb'}))
app.use(express.json({limit:'16kb'}))
app.use(cookieParser());


//Routers
import userRouter from "./routes/user.routes.js"
app.use("/api/v1/users",userRouter)

import room from "./routes/room.routes.js"
app.use("/api/v1/rooms",room)



export default app