import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { Message } from "../models/message.model.js";

export const initializeSocket = (httpServer) => {

    const io = new Server(httpServer, {
        cors: { origin: "http://localhost:5173", credentials: true }
    });

    // ── Auth middleware ───────────────────────────────────────────────────────
    io.use((socket, next) => {
        try {
            const cookieString = socket.handshake.headers.cookie;
            if (!cookieString) throw new Error("No cookies found");

            const cookies = cookie.parse(cookieString);
            const token = cookies?.accessToken;
            if (!token) throw new Error("Missing access token");

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            console.error("Socket Auth Error:", error.message);
            next(new Error("Authentication error"));
        }
    });

    // ── Connection ────────────────────────────────────────────────────────────
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user?.email || socket.id}`);

        // ── Room join/leave ───────────────────────────────────────────────────
        socket.on("join-room", (roomId) => {
            socket.join(roomId);
            socket.to(roomId).emit("user-joined", { userId: socket.user._id });
            console.log(`User ${socket.user._id} joined room ${roomId}`);
        });

        // ── Code sync ─────────────────────────────────────────────────────────
        socket.on("code-change", ({ roomId, code }) => {
            socket.to(roomId).emit("code-update", code);
        });

        // ── Language change — broadcast to whole room so everyone's Monaco switches
        socket.on("language-change", ({ roomId, language }) => {
            socket.to(roomId).emit("language-update", language);
        });

        // ── Chat ──────────────────────────────────────────────────────────────
        socket.on("send-message", async ({ roomId, content }) => {
            if (!content?.trim()) return;

            try {
                // Save to DB with populated sender so frontend gets name immediately
                const message = await Message.create({
                    room: roomId,
                    sender: socket.user._id,
                    content: content.trim()
                });

                const populated = await message.populate("sender", "name role");

                // Broadcast to everyone in the room INCLUDING sender
                io.to(roomId).emit("receive-message", {
                    _id: populated._id,
                    content: populated.content,
                    sender: populated.sender,
                    createdAt: populated.createdAt
                });
            } catch (err) {
                console.error("Chat save error:", err.message);
                // Notify only this socket of failure
                socket.emit("message-error", "Failed to send message");
            }
        });

        // ── Cursor sync ───────────────────────────────────────────────────────
        socket.on("cursor-move", ({ roomId, cursorData }) => {
            socket.to(roomId).emit("cursor-update", {
                userId: socket.user._id,
                userName: socket.user.name,
                ...cursorData
            });
        });

        // ── Disconnect cleanup ────────────────────────────────────────────────
        socket.on("disconnecting", () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    socket.to(room).emit("user-left", { userId: socket.user._id });
                }
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};