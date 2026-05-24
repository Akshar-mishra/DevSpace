import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { ApiErrors } from "../utils/ApiErrors.js";
import { Problem } from "../models/problem.model.js";
import { Room}  from "../models/room.model.js"

export const roomCodeState = new Map()

export const initializeSocket = (httpServer) => {

    const io = new Server(httpServer, {
        cors: { origin: "http://localhost:5173", credentials: true }
    });
    
    // Auth middleware 
    io.use((socket, next) => {
        try {
            const cookieString = socket.handshake.headers.cookie;
            if (!cookieString) {
                throw new ApiErrors(401,"No cookies found");
            }

            //making cookie to object
            const cookies = cookie.parse(cookieString);
            const token = cookies?.accessToken;
            if (!token){
                throw new ApiErrors(401,"Missing access token");
            } 

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            console.error("Socket Auth Error:", error.message);
            next(new ApiErrors(401, "Authentication error"));
        }
    });

    // Connection  //socket=client 
    io.on("connection", (socket) => {
        // Room join/leave  (socket io's room)
        socket.on("join-room", (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit("user-joined", { userId: socket.user._id });

            //send current state to the joining user
            const state = roomCodeState.get(roomId);
            if (state) {
                socket.emit("room-state", state); // only to this socket
            }
        });

        // Code sync
        socket.on("code-change", ({ roomId, problemId, code }) => {
            if (!roomId || !problemId) return;
            const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} };
            
            if (!currentState.codes) currentState.codes = {};
            currentState.codes[problemId] = code;
            
            roomCodeState.set(roomId, currentState);
            socket.to(roomId).emit("code-update", { problemId, code });
        });

        // Language change
        socket.on("language-change", ({ roomId, problemId, language }) => {
            if (!roomId || !problemId) return;
            const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} };
            
            if (!currentState.languages) currentState.languages = {};
            currentState.languages[problemId] = language;
            
            roomCodeState.set(roomId, currentState);
            socket.to(roomId).emit("language-update", { problemId, language });
        });

        // Chat 
        socket.on("send-message", async ({ roomId, content }) => {
            if (!content?.trim()) return;
                // Broadcast to everyone in the room INCLUDING sender
            io.to(roomId).emit("receive-message", {
                content: content.trim(),
                sender: { _id: socket.user._id, name: socket.user.name },
                createdAt: new Date()
            })
            
        });

        // Broadcast new room state to the candidate
        socket.on("notify-new-problem", ({ roomId, updatedRoomData }) => {
            if (!roomId || !updatedRoomData) return;
            
            // Send the fresh room data to everyone EXCEPT the sender
            socket.to(roomId).emit("room-updated", updatedRoomData);
        });

        socket.on("problem-selected", async({roomId,problemId})=>{
            if (!roomId || !problemId) {
                socket.emit("problem-error", { message: "Missing roomId or problemId" });
                return;
            }
             try {
                const problem = await Problem.findById(problemId)
                                            .select("-testCases -createdBy -createdAt -updatedAt")
                io.to(roomId).emit("problem-loaded", problem)
            } catch (error) {
                socket.emit("problem-error", { message: "Failed to load problem" })
            }

        })

        // Disconnect cleanup 
        socket.on("disconnecting", () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    socket.to(room).emit("user-left", { userId: socket.user._id });
                }
            }
        });
        // 🚨 Phase 3: The Lockdown Signal
        socket.on("trigger-end-session", ({ roomId }) => {
            if (!roomId) return;
            
            // Broadcast to everyone (Candidate) that the session is dead
            io.to(roomId).emit("interview-ended");
            
            // Now it is safe to wipe the server RAM
            roomCodeState.delete(roomId);
        });
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};