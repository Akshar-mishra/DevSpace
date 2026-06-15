import { useEffect, useState, useRef, useCallback, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Editor from "@monaco-editor/react"
import { useSocket } from "../context/SocketContext"
import { AuthContext } from "../context/AuthContext"
import api from "../services/api"
import ProblemGeneratorModal from "../components/ProblemGeneratorModal";
import FeedbackModal from "../components/FeedbackModal.jsx"
import { submitSessionFeedback } from "../services/session.service.js";

const DEFAULT_BOILERPLATE = "// Write your solution here\n"

const LANGUAGES = [
    { value: "python", label: "Python", ext: "py" },
    { value: "java", label: "Java", ext: "java" },
    { value: "cpp", label: "C++", ext: "cpp" },
]

function shouldShareEditor(room) {
    if (!room) return true
    if (room.type === "interview_room") return true
    if (room.type === "friendly_room") return true
    return false
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// Avatar helpers 
const AVATAR_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6"
]
function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function getUserColorClass(userId) {
    if (!userId) return "remote-cursor-0";
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `remote-cursor-${Math.abs(hash) % AVATAR_COLORS.length}`;
}

function AvatarStack({ participants }) {
    return (
        <div className="flex items-center gap-1.5 bg-[#1A1D29] px-2 py-1 rounded-lg border border-slate-600/30">
            <div className="flex -space-x-2">
                {participants.slice(0, 4).map((p, i) => (
                    <div
                        key={p._id || i}
                        title={p.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0A0A0A] shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                        {getInitials(p.name)}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-1.5 px-2 text-[11px] text-slate-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                {participants.length} Online
            </div>
        </div>
    )
}


// Chat Panel 
function ChatPanel({ roomId, socket, currentUser ,messages}) {
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const sendMessage = () => {
        const trimmed = input.trim()
        if (!trimmed || !socket) return
        socket.emit("send-message", { roomId, content: trimmed })
        setInput("")
    }

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#0A0A0A]">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                        <p className="text-2xl mb-2">💬</p>
                        <p className="text-xs text-slate-400 font-medium">No messages yet.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender?._id === currentUser?._id ||
                            msg.sender?._id === currentUser?.id
                        return (
                            <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                                    {isMe ? "You" : (msg.sender?.name ?? "Unknown")}
                                </span>
                                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words shadow-sm ${isMe
                                        ? "bg-indigo-500 text-white rounded-tr-sm"
                                        : "bg-[#1A1D29] border border-slate-600/30 text-slate-200 rounded-tl-sm"
                                    }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[9px] font-medium text-slate-600 mt-1 px-1">
                                    {formatTime(msg.createdAt)}
                                </span>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-slate-600/20 bg-[#1A1D29]">
                <div className="flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-400 transition-colors border border-slate-600/30 bg-[#0A0A0A]"
                        style={{ maxHeight: "80px" }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="shrink-0 w-10 h-10 flex items-center justify-center bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors text-white shadow-sm"
                    >
                        <svg className="w-4 h-4 translate-x-[1px] translate-y-[-1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}



//Room Page
export default function Room() {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const { socket } = useSocket()
    const { user } = useContext(AuthContext)

    
    const [messages, setMessages] = useState([])

    const [roomData, setRoomData] = useState(null)
    const [participants, setParticipants] = useState([])
    const [language, setLanguage] = useState("python")

    const [activeSidebarTab, setActiveSidebarTab] = useState("problem") 
    const [activeProblem, setActiveProblem] = useState(null)
    const [generatorOpen, setGeneratorOpen] = useState(false)

    const hasEdited = useRef({})

    const localCodeCache = useRef({})
    const activeProblemRef = useRef(activeProblem)
    const languageRef = useRef(language)
    useEffect(() => {
        activeProblemRef.current = activeProblem
    }, [activeProblem])
    useEffect(() => {
        languageRef.current = language
    }, [language])
    const editorRef = useRef(null)
    const monacoRef = useRef(null)                  //  Holds the monaco instance
    const remoteCursorsRef = useRef({})             // Tracks x,y of everyone
    const decorationsCollectionRef = useRef(null)   //  The painter tool
    const isRemoteUpdate = useRef(false)
    const pendingState = useRef(null)
    const roomDataRef = useRef(null)

    const [endTime, setEndTime] = useState(null)
    const [timeLeft, setTimeLeft] = useState("00:00")
    const [currentHint, setCurrentHint] = useState(null)
    const [interviewerNotes, setInterviewerNotes] = useState("");
    const [hintInput, setHintInput] = useState("");
    const [timerInput, setTimerInput] = useState("45");
    const [feedbackSessionId, setFeedbackSessionId] = useState(null)
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

    // Load room
    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                const res = await api.get(`/rooms/${roomId}`)
                if (!cancelled) {
                    const roomData = res.data.data
                    setRoomData(roomData)
                    setParticipants(roomData.participants ?? [])
                    // restore active problem on refresh
                    if (roomData.problems && roomData.problems.length > 0) {
                        const lastProblem = roomData.problems[roomData.problems.length - 1]
                        setActiveProblem(lastProblem)
                        setSelectedProblem(lastProblem)
                    }
                }
            } 
            catch {
                if (!cancelled) navigate("/dashboard")
            }
        }
        load()
        return () => { cancelled = true }
    }, [roomId, navigate])

    //MASTER SOCKET LISTENER
    useEffect(() => {
        if (!socket) return
        socket.on("room-state", (state) => {
            if (state?.codes) {
                localCodeCache.current = state.codes
            }
            if (state?.endTime) {
                setEndTime(state.endTime)
            }

            // roomDataRef is always current — no stale closure issue
            const problems = roomDataRef.current?.problems
            if (state?.activeProblemId && problems) {
                const serverProb = problems.find(p => p._id === state.activeProblemId)
                if (serverProb) {
                    setActiveProblem(serverProb)
                    setSelectedProblem(serverProb)
                    // restore language
                    const serverLang = state.languages?.[state.activeProblemId]
                    if (serverLang) setLanguage(serverLang)
                    return
                }
            }

            // no activeProblemId from server — just set first problem if nothing active
            if (problems?.length > 0 && !activeProblemRef.current) {
                const firstProb = problems[0]
                setActiveProblem(firstProb)
                setSelectedProblem(firstProb)
                const serverLang = state.languages?.[firstProb._id]
                if (serverLang) setLanguage(serverLang)
            }
        })

        socket.on("timer-started", ({ endTime }) => {
            setEndTime(endTime)
        })

        socket.on("receive-hint", ({ hint }) => setCurrentHint(hint))

        // Participants update on join 
        socket.on("code-update", ({ problemId, language: updateLang, code }) => {
            const currProblem = activeProblemRef.current;
            const currLang = languageRef.current;

            if (!localCodeCache.current[problemId]) {
                localCodeCache.current[problemId] = {}
            }
            localCodeCache.current[problemId][updateLang] = code;

            const isSameProblem = currProblem && String(currProblem._id) === String(problemId);

            if (isSameProblem && currLang === updateLang && editorRef.current) {
                if (editorRef.current.getValue() !== code) {
                    isRemoteUpdate.current = true;
                    editorRef.current.setValue(code ?? "");
                    setTimeout(() => {
                        isRemoteUpdate.current = false
                    }, 0);
                }
            }
        })

        socket.on("language-update", ({ problemId, language }) => {
            const currProblem = activeProblemRef.current;
            if (currProblem && String(currProblem._id) === String(problemId)) {
                setLanguage(language);
            }
        })

        socket.on("room-updated", (updatedRoomData) => {
            setRoomData(updatedRoomData)
            const newProblem = updatedRoomData.problems[updatedRoomData.problems.length - 1]
            setActiveProblem(newProblem)       
            setSelectedProblem(newProblem)  
        })

        socket.on("interview-ended", () => {
            setRoomData(prev => ({ ...prev, status: "ended" }));
            alert("The session has concluded. The workspace is now locked.");
        })

        socket.on("cheat-warning", ({ message }) => {
            if (user?.role === "interviewer" && roomData?.type === "interview_room") {
                alert(message);
            }
        })

        socket.on("receive-cursor", ({ userId, userName, position }) => {
            const myId = user?._id || user?.id;
            if (userId === myId) return; 
            remoteCursorsRef.current[userId] = { position, userName };

            // Repaint ALL remote cursors
            if (decorationsCollectionRef.current && monacoRef.current) {
                const newDecorations = Object.entries(remoteCursorsRef.current).map(([uid, cursorInfo]) => ({
                    range: new monacoRef.current.Range(
                        cursorInfo.position.lineNumber,
                        cursorInfo.position.column,
                        cursorInfo.position.lineNumber,
                        cursorInfo.position.column
                    ),
                    options: {
                        className: `remote-cursor ${getUserColorClass(uid)}`,
                        hoverMessage: { value: `**${cursorInfo.userName}**` }, // Markdown hover
                        stickiness: monacoRef.current.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                }));
                
                decorationsCollectionRef.current.set(newDecorations);
            }
        })
        return () => {
            socket.off("room-state")
            socket.off("timer-started")      
            socket.off("receive-hint") 
            socket.off("code-update")
            socket.off("language-update")
            socket.off("room-updated")
            socket.off("interview-ended")
            socket.off("cheat-warning")
            socket.off("receive-cursor")
        }
    }, [socket, roomData])

    // SWAPPER when language and problem check local first then change
    useEffect(() => {
        if (!activeProblem || !editorRef.current) return
        const pId = String(activeProblem._id)
        const savedCode = localCodeCache.current[pId]?.[language]

        isRemoteUpdate.current = true

        if (savedCode !== undefined) {
            editorRef.current.setValue(savedCode);
        } 
        else {
            const boilerplate = activeProblem.boilerplates?.[language] || DEFAULT_BOILERPLATE;
            editorRef.current.setValue(boilerplate);
            if (!localCodeCache.current[pId]) localCodeCache.current[pId] = {};
            localCodeCache.current[pId][language] = boilerplate;
            if (socket && roomId) {
                socket.emit("code-change", {
                    roomId,
                    problemId: pId,
                    language: language,
                    code: boilerplate
                });
            }
        }
        setTimeout(() => {
             isRemoteUpdate.current = false
        }, 0);
    }, [activeProblem, language]);


    // Join socket room
    useEffect(() => {
        if (!socket || !roomId || !roomData) return
        socket.emit("join-room", roomId)
        return () => {
            socket.emit("leave-room", roomId);
        }
    }, [socket, roomId, roomData])

    // Participant events
    useEffect(() => {
        if (!socket) return
        socket.on("participants-updated", (users) => {
            setParticipants(users)
        })
        return () => socket.off("participants-updated")
    }, [socket])

    useEffect(() => {
        if (!socket || !roomId || roomData?.status === "ended") return;
        if (user?.role === "interviewer") return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                socket.emit("tab-switched", {
                    roomId,
                    candidateName: user?.name || "Candidate"
                });
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [socket, roomId, roomData, user]);

    // Countdown timer
    useEffect(() => {
        if (!endTime) return
        const interval = setInterval(() => {
            const remaining = endTime - Date.now()
            if (remaining <= 0) {
                clearInterval(interval)
                setTimeLeft("00:00")
                return
            }
            const minutes = Math.floor(remaining / 60000).toString()
            const seconds = Math.floor((remaining % 60000) / 1000).toString()
            const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            setTimeLeft(formattedTime)
        }, 1000)
        return () => clearInterval(interval)
    }, [endTime])
    
    useEffect(() => {
        if (roomData?.problems && roomData.problems.length > 0 && !selectedProblem) {
            setSelectedProblem(roomData.problems[0])  // only set if nothing selected yet
        }
    }, [roomData])

    useEffect(() => {
        if (roomData?.problems && roomData.problems.length > 0 && !activeProblem) {
            const firstProblem = roomData.problems[0]
            setActiveProblem(firstProblem)
            setSelectedProblem(firstProblem)
        }
    }, [roomData?.problems, activeProblem])

    //chat
    useEffect(() => {
         if (!socket) return
        const onMessage = (msg) => setMessages(prev => [...prev, msg])
        socket.on("receive-message", onMessage)
        return () => socket.off("receive-message", onMessage)
    }, [socket])


    const handleEditorDidMount = useCallback((editor) => {
        editorRef.current = editor
        monacoRef.current = monaco 
        decorationsCollectionRef.current = editor.createDecorationsCollection([]);

        // Broadcast local cursor movements
        editor.onDidChangeCursorPosition((e) => {
            if (socket && roomId) {
                socket.emit("cursor-change", {
                    roomId,
                    userId: user?._id || user?.id,
                    userName: user?.name || "Anonymous",
                    position: e.position
                });
            }
        });

        if (pendingState.current) {
            editor.setValue(pendingState.current)
            pendingState.current = null
        }
        const currProblem = activeProblemRef.current
        const currLang = languageRef.current
        if (currProblem) {
            const saved = localCodeCache.current[String(currProblem._id)]?.[currLang]
            const val = saved ?? currProblem.boilerplates?.[currLang] ?? DEFAULT_BOILERPLATE
            editor.setValue(val)
        }
    }, [socket, roomId, user])

    const handleEditorChange = (value) => {
        const currProblem = activeProblemRef.current;
        const currLang = languageRef.current;

        if (isRemoteUpdate.current || !currProblem) return;

        if (!hasEdited.current[currProblem._id]) {
            hasEdited.current[currProblem._id] = {};
        }
        hasEdited.current[currProblem._id][currLang] = true;

        if (!localCodeCache.current[currProblem._id]) {
            localCodeCache.current[currProblem._id] = {};
        }
        
        localCodeCache.current[currProblem._id][currLang] = value;
        if (socket && roomId && shouldShareEditor(roomData)) {
            socket.emit("code-change", { roomId, problemId: currProblem._id, language: currLang, code: value ?? "" });
        }
    }

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        const currProblem = activeProblemRef.current;
        if (socket && roomId && currProblem) {
            socket.emit("language-change", { roomId, problemId: currProblem._id, language: lang });
        }
    }

    const [selectedProblem, setSelectedProblem] = useState(null)

    const handleProblemChange = (e) => {
        const problemId = e.target.value
        const problem = roomData.problems.find(p => p._id === problemId)
        setSelectedProblem(problem)
        setActiveProblem(problem) 
        if (socket) {
            socket.emit("problem-selected", { roomId, problemId })
        }
    }

    useEffect(() => {
        if (!socket) return
        socket.on("problem-loaded", (problem) => {
            setActiveProblem(problem)
            setSelectedProblem(problem)
        })
        return () => socket.off("problem-loaded")
    }, [socket])

    const handleFeedbackSubmit = async (formData) => {
        setIsSubmittingFeedback(true);
        try {
            await submitSessionFeedback(feedbackSessionId, formData);
            navigate("/dashboard");
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            alert(error.response?.data?.message || "Failed to submit feedback. Try again.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };


    const handleRunCode = () => {
        alert("Code execution coming soon...");
    }

    if (!roomData) {
        return (
            <div className="flex min-h-screen items-center justify-center text-gray-300 bg-[#0A0A0A]">
                <div className="text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-medium text-slate-400">Initializing Workspace...</p>
                </div>
            </div>
        )
    }

    const sharing = shouldShareEditor(roomData)
    const currentLang = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0]
    const isInterviewer = roomData?.type === "interview_room" && user?.role === "interviewer"

    return (
        <div className="flex flex-col h-screen text-slate-200 bg-[#0A0A0A] font-sans overflow-hidden">

            {/* ── IDE Header ── */}
            <header className="flex shrink-0 items-center justify-between border-b border-slate-600/20 px-5 py-3 bg-[#1A1D29]">

                {/* Left */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#c9d1d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </div>
                        <h1 className="text-sm font-bold text-white tracking-tight">{roomData.name}</h1>
                    </div>
                    <div className="h-4 w-px bg-slate-600/30" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {roomData.type === "interview_room" ? "Interview Mode" : "Collab Mode"}
                    </span>
                    {!sharing && (
                        <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">Private Editor</span>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-3">
                    <AvatarStack participants={participants} />

                    {endTime && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-xs ${timeLeft === "00:00" ? "border-red-500/40 text-red-400 bg-red-500/10" : "border-slate-600/30 text-slate-300 bg-[#0A0A0A]"
                            }`}>
                            ⏱ {timeLeft}
                        </div>
                    )}

                    <div className="h-4 w-px bg-slate-600/30 mx-1" />

                    <button onClick={() => navigator.clipboard.writeText(roomData.inviteLink)}
                        title="Copy Link"
                        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    </button>
                    <button onClick={() => navigate("/dashboard")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white border border-transparent hover:text-red-500 hover:bg-white/5 transition-colors">
                        Leave
                    </button>

                    {isInterviewer && roomData.status !== "ended" && (
                        <button onClick={async () => {
                            if (window.confirm("End this session? The workspace will be locked.")) {
                                try {
                                    const res = await api.put(`/rooms/${roomId}/end`, {
                                        finalCache: localCodeCache.current,
                                        interviewerNotes: interviewerNotes
                                    });
                                    const room = res.data.data.room || res.data.data;
                                    const sId = res.data.data.sessionId;
                                    setRoomData(room);
                                    socket.emit("trigger-end-session", { roomId });
                                    setFeedbackSessionId(sId);
                                } catch (err) {
                                    alert("Error ending session.");
                                }
                            }
                        }}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-colors bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white shadow-sm">
                            End Session
                        </button>
                    )}
                </div>
            </header>

            {/* ── Main Body ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── Sidebar (Tabs) ── */}
                <div className="w-80 shrink-0 flex flex-col border-r border-slate-600/20 bg-[#0A0A0A]">
                    {/* Tab Headers */}
                    <div className="flex border-b border-slate-600/20 bg-[#222328]">
                        <button onClick={() => setActiveSidebarTab("problem")}
                            className={`flex-1 py-2.5 text-s font-bold transition-colors border-b-2 ${activeSidebarTab === "problem" ? "text-indigo-400 border-indigo-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                            Problem
                        </button>
                        <button onClick={() => setActiveSidebarTab("chat")}
                            className={`flex-1 py-2.5 text-s font-bold transition-colors border-b-2 ${activeSidebarTab === "chat" ? "text-indigo-400 border-indigo-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                            Chat
                        </button>
                        {isInterviewer && (
                            <button onClick={() => setActiveSidebarTab("notes")}
                                className={`flex-1 py-2.5 text-s font-bold transition-colors border-b-2 ${activeSidebarTab === "notes" ? "text-indigo-400 border-indigo-400" : "text-slate-500 border-transparent hover:text-slate-300"}`}>
                                Panel
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 min-h-0 overflow-hidden relative">

                        {/* Problem Tab */}
                        {activeSidebarTab === "problem" && (
                            <div className="absolute inset-0 overflow-y-auto p-5 custom-scrollbar text-sm text-slate-300">
                                {activeProblem ? (
                                    <>
                                        <h2 className="text-lg font-bold text-white mb-4 leading-snug">{activeProblem.title}</h2>
                                        <p className="whitespace-pre-wrap leading-relaxed text-slate-300 mb-6">{activeProblem.statement}</p>

                                        {activeProblem.examples?.length > 0 && (
                                            <div className="space-y-4 mb-6">
                                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Examples</h3>
                                                {activeProblem.examples.map((ex, i) => (
                                                    <div key={i} className="rounded-lg border border-slate-600/30 bg-[#1A1D29] font-mono text-[11px] p-3 shadow-inner">
                                                        <p><span className="text-indigo-300 font-bold">Input:</span> {ex.input}</p>
                                                        <p className="mt-1"><span className="text-emerald-300 font-bold">Output:</span> {ex.output}</p>
                                                        {ex.explanation && <p className="mt-1.5 text-slate-500 border-t border-slate-600/30 pt-1.5">// {ex.explanation}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {activeProblem.constraints && (
                                            <div>
                                                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Constraints</h3>
                                                <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[11px]">
                                                    {activeProblem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500 text-xs font-mono">No problem active.</div>
                                )}
                            </div>
                        )}

                        {/* Chat Tab */}
                        {activeSidebarTab === "chat" && (
                            <div className="absolute inset-0">
                                <ChatPanel roomId={roomId} socket={socket} currentUser={user} messages={messages} setMessages={setMessages}/>
                            </div>
                        )}

                        {/* Interviewer Panel Tab */}
                        {activeSidebarTab === "notes" && isInterviewer && (
                            <div className="absolute inset-0 overflow-y-auto p-5 custom-scrollbar space-y-6">
                                {/* Timer */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Session Timer</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={timerInput} onChange={(e) => setTimerInput(e.target.value)}
                                            className="w-20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none border border-slate-600/30 bg-[#1A1D29]" placeholder="Mins" />
                                        <button onClick={() => {
                                            if (!timerInput || isNaN(timerInput)) return;
                                            socket.emit("start-timer", { roomId, durationMinutes: Number(timerInput) });
                                        }} className="flex-1 rounded-lg text-xs font-bold transition-colors bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm">
                                            Start Clock
                                        </button>
                                    </div>
                                </div>

                                {/* Hint */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Push Hint to Candidate</label>
                                    <textarea value={hintInput} onChange={(e) => setHintInput(e.target.value)}
                                        placeholder="Type a hint..." className="w-full rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 resize-none h-20 border border-slate-600/30 bg-[#1A1D29]" />
                                    <button onClick={() => {
                                        if (!hintInput.trim()) return;
                                        socket.emit("send-hint", { roomId, hint: hintInput.trim() });
                                        setHintInput("");
                                    }} className="w-full py-2.5 rounded-lg text-xs font-bold transition-colors border border-slate-600/30 hover:border-slate-500 hover:text-white text-slate-300">
                                        Send Hint
                                    </button>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Private Notes (Saved on End)</label>
                                    <textarea value={interviewerNotes} onChange={(e) => setInterviewerNotes(e.target.value)}
                                        placeholder="Evaluate logic, speed, edge cases..." className="w-full flex-1 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400 resize-none border border-slate-600/30 bg-[#1A1D29]" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Editor & Terminal Area ── */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#1A1D29] relative">

                    {/* Editor Toolbar */}
                    <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-600/20 bg-[#0A0A0A]">
                        {roomData?.problems && roomData.problems.length > 0 && (
                            <select value={selectedProblem?._id || ""} onChange={handleProblemChange}
                                className="max-w-[180px] text-xs font-bold rounded-lg px-3 py-1.5 outline-none border border-slate-600/30 bg-[#1A1D29] text-slate-200 cursor-pointer">
                                <option value="">Select Problem</option>
                                {roomData.problems.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                            </select>
                        )}
                        <select value={language} onChange={handleLanguageChange} disabled={roomData.status === "ended"}
                            className="text-xs font-bold rounded-lg px-3 py-1.5 outline-none border border-slate-600/30 bg-[#1A1D29] text-slate-200 cursor-pointer disabled:opacity-50">
                            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>

                        <div className="flex-1" />

                        {(isInterviewer || roomData?.type === "friendly_room") && (
                            <button onClick={() => setGeneratorOpen(true)} disabled={roomData.status === "ended"}
                                className="flex items-center gap-1 px-4 py-1 rounded-lg text-xs font-bold text-purple-500 transition-colors disabled:opacity-40 hover:bg-teal-500/10 border border-transparent hover:border-indigo-500/30">
                                ✨ Ai Generate
                            </button>
                        )}

                        <button onClick={handleRunCode} disabled={roomData.status === "ended"}>
                            ▶ Run
                        </button>

                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language={language}
                            path={`room-${roomId}.${currentLang.ext}`}
                            defaultValue={DEFAULT_BOILERPLATE}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                readOnly: roomData.status === "ended",
                                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                padding: { top: 16 }
                            }}
                        />

                        {/* Floating Hint Alert (Candidate Only) */}
                        {currentHint && user?.role !== "interviewer" && (
                            <div className="absolute top-4 right-4 z-50 w-72 bg-[#1A1D29] rounded-xl border border-indigo-500/30 shadow-2xl overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-600/30 bg-indigo-500/10 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">💡 Hint Incoming</span>
                                    <button onClick={() => setCurrentHint(null)} className="text-slate-400 hover:text-white">✕</button>
                                </div>
                                <div className="p-4 text-sm text-slate-300 leading-relaxed bg-[#0A0A0A]">{currentHint}</div>
                            </div>
                        )}
                    </div>
                    
                </div>
            </div>

            {/* Modals */}
            <ProblemGeneratorModal
                isOpen={generatorOpen}
                onClose={() => setGeneratorOpen(false)}
                onProblemGenerated={(updatedRoomData) => {
                    setRoomData(updatedRoomData);
                    const newProblem = updatedRoomData.problems[updatedRoomData.problems.length - 1];
                    setActiveProblem(newProblem);
                    setSelectedProblem(newProblem);
                    if (socket){
                        socket.emit("notify-new-problem", { roomId, updatedRoomData });
                    } 
                }}
                socket={socket} roomId={roomId}
            />

            <FeedbackModal
                isOpen={feedbackSessionId !== null} 
                onSubmit={handleFeedbackSubmit}
                isSubmitting={isSubmittingFeedback}
            />
        </div>
    )
}