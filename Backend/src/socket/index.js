import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import cookie from "cookie"
import { ApiErrors } from "../utils/ApiErrors.js"
import { Problem } from "../models/problem.model.js"
import { Room } from "../models/room.model.js"

export const roomCodeState = new Map()
export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }
    })

    // Auth middleware 
    io.use((socket, next) => {
        try {
            const cookieString = socket.handshake.headers.cookie
            if (!cookieString) {
                throw new ApiErrors(401, "No cookies found")
            }

            //making cookie to object
            const cookies = cookie.parse(cookieString)
            const token = cookies?.accessToken
            if (!token) {
                throw new ApiErrors(401, "Missing access token")
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
            socket.user = decoded
            next()
        }
        catch (error) {
            console.error("Socket Auth Error:", error.message)
            next(new ApiErrors(401, "Authentication error"))
        }
    })

    // Connection
    io.on("connection", (socket) => {
        // socket io's room
        socket.on("join-room", async (roomId) => {
            socket.join(roomId)
            const socketsInRoom = await io.in(roomId).fetchSockets()
            const activeUsers = socketsInRoom.map(s => s.user).filter(Boolean)

            io.to(roomId).emit("participants-updated", activeUsers)

            // Send current state to the joining user
            const state = roomCodeState.get(roomId) || { codes: {}, languages: {} }
            socket.emit("room-state", state)
        })

        // leaving the room
        socket.on("leave-room", async (roomId) => {
            socket.leave(roomId)
            const socketsInRoom = await io.in(roomId).fetchSockets()
            const activeUsers = socketsInRoom.map(s => s.user).filter(Boolean)

            io.to(roomId).emit("participants-updated", activeUsers)
        })

        socket.on("start-timer", ({ roomId, durationMinutes }) => {
            if (!roomId || !durationMinutes) return
            const endTime = Date.now() + (durationMinutes * 60 * 1000)

            const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} }
            currentState.endTime = endTime
            roomCodeState.set(roomId, currentState)

            io.to(roomId).emit("timer-started", { endTime })
        })

        socket.on("send-hint", ({ roomId, hint }) => {
            if (!roomId || !hint) return
            socket.to(roomId).emit("receive-hint", { hint })
        })

        // Code sync
        socket.on("code-change", ({ roomId, problemId, language, code }) => {
            if (!roomId || !problemId || !language) return
            const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} }

            // Create nested structure: codes[problemId][language]
            if (!currentState.codes) currentState.codes = {}
            if (!currentState.codes[problemId]) currentState.codes[problemId] = {}

            currentState.codes[problemId][language] = code

            roomCodeState.set(roomId, currentState)

            socket.to(roomId).emit("code-update", { problemId, language, code })
        })

        // Language change
        socket.on("language-change", ({ roomId, problemId, language }) => {
            if (!roomId || !problemId) return
            const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} }

            if (!currentState.languages) currentState.languages = {}
            currentState.languages[problemId] = language

            roomCodeState.set(roomId, currentState)
            socket.to(roomId).emit("language-update", { problemId, language })
        })

        // Chat 
        socket.on("send-message", async ({ roomId, content }) => {
            if (!content?.trim()) return

            io.to(roomId).emit("receive-message", {
                content: content.trim(),
                sender: { _id: socket.user._id, name: socket.user.name },
                createdAt: new Date()
            })

        })

        socket.on("notify-new-problem", ({ roomId, updatedRoomData }) => {
            if (!roomId) return

            socket.to(roomId).emit("room-updated", updatedRoomData)
        })

        socket.on("problem-selected", async ({ roomId, problemId }) => {
            if (!roomId || !problemId) {
                socket.emit("problem-error", { message: "Missing roomId or problemId" })
                return
            }
            try {
                const problem = await Problem.findById(problemId)
                    .select("-testCases -createdBy -createdAt -updatedAt")

                const currentState = roomCodeState.get(roomId) || { codes: {}, languages: {} }
                currentState.activeProblemId = problemId
                roomCodeState.set(roomId, currentState)

                io.to(roomId).emit("problem-loaded", problem)
            } catch (error) {
                socket.emit("problem-error", { message: "Failed to load problem" })
            }
        })

        //  Anti-Cheat
        socket.on("tab-switched", ({ roomId, candidateName }) => {
            if (!roomId) return

            socket.to(roomId).emit("cheat-warning", {
                message: `⚠️ ANTI-CHEAT ALERT: ${candidateName} just switched tabs or minimized the window!`
            })
        })

        socket.on("cursor-change", ({ roomId, userId, userName, position }) => {
            // Broadcast to everyone else in the room
            socket.to(roomId).emit("receive-cursor", { userId, userName, position });
        });

        // Disconnect cleanup 
        socket.on("disconnecting", async () => {
            for (const room of socket.rooms) {
                if (room !== socket.id) {
                    const socketsInRoom = await io.in(room).fetchSockets()
                    // Filter out the person who is currently leaving
                    const activeUsers = socketsInRoom
                        .filter(s => s.id !== socket.id)
                        .map(s => s.user).filter(Boolean)

                    io.to(room).emit("participants-updated", activeUsers)
                }
            }
        })

        socket.on("trigger-end-session", async ({ roomId }) => {
            if (!roomId) return

            try {
                const finalState = roomCodeState.get(roomId)

                if (finalState && finalState.codes) {
                    const snapshots = []

                    for (const [probId, languages] of Object.entries(finalState.codes)) {
                        for (const [lang, codeStr] of Object.entries(languages)) {
                            snapshots.push({
                                problem: probId,
                                language: lang,
                                code: codeStr
                            })
                        }
                    }

                    await Session.findOneAndUpdate(
                        { room: roomId },
                        {
                            $set: {
                                codeSnapshots: snapshots,
                                endedAt: new Date()
                            }
                        },
                        { sort: { createdAt: -1 } } 
                    )
                }
            } catch (error) {
                console.error("Failed to save snapshots to DB:", error)
            }
            
            io.to(roomId).emit("interview-ended")
            
            roomCodeState.delete(roomId)
        })

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.id}`)
        })
    })
}     