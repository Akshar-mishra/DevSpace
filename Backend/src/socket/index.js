import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { ApiErrors } from "../utils/ApiErrors.js";

export const initializeSocket = (httpServer) => {

    const io = new Server(httpServer, {
        cors: { origin: "http://localhost:5173", credentials: true }
    });
    
    const roomCodeState = new Map();
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

            // 👇 This is the fix — send current state to the joining user
            const state = roomCodeState.get(roomId);
            if (state) {
                socket.emit("room-state", state); // only to this socket
            }
        });

        // Code sync 
        socket.on("code-change", ({ roomId, code }) => {
            roomCodeState.set(roomId, { 
                ...roomCodeState.get(roomId), 
                code 
            });
            socket.to(roomId).emit("code-update", code);
        });

        //Language change — broadcast to whole room so everyone's Monaco switches
        socket.on("language-change", ({ roomId, language }) => {
            roomCodeState.set(roomId, { 
                ...roomCodeState.get(roomId), 
                language 
            });
            socket.to(roomId).emit("language-update", language);
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


        // Disconnect cleanup 
        socket.on("disconnecting", () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    socket.to(room).emit("user-left", { userId: socket.user._id });
                }
            }
        });
        socket.on("end-session", ({ roomId }) => {
            roomCodeState.delete(roomId);
        });
        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};