import { useEffect, useState, useRef, useCallback, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Editor from "@monaco-editor/react"
import { useSocket } from "../context/SocketContext"
import { AuthContext } from "../context/AuthContext"
import api from "../services/api"
import { runCodeService } from "../services/code.service.js"
import { generateProblem } from "../services/problem.service.js"
import ProblemGeneratorModal from "../components/ProblemGeneratorModal";
import FeedbackModal from "../components/FeedbackModal.jsx"
import { submitSessionFeedback } from "../services/session.service.js";

const DEFAULT_BOILERPLATE = "// Write your solution here\n"

const LANGUAGES = [
    { value: "python",     label: "Python",     ext: "py" },
    { value: "java",       label: "Java",       ext: "java" },
    { value: "cpp",        label: "C++",        ext: "cpp" },
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

// ── Avatar helpers ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b", "#3b82f6"
]
function getInitials(name) {
    if (!name) return "?"
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}
function AvatarStack({ participants }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
                {participants.slice(0, 4).map((p, i) => (
                    <div
                        key={p._id || i}
                        title={p.name}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#0d0f1c] shrink-0"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                        {getInitials(p.name)}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 text-[11px] text-gray-400"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {participants.length}
            </div>
        </div>
    )
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ roomId, socket, currentUser }) {
    const [messages, setMessages] = useState([])
    const [input, setInput]       = useState("")
    const [loading, setLoading]   = useState(false)
    const bottomRef               = useRef(null)

    useEffect(() => {
        if (!socket) return
        const onMessage = (msg) => setMessages(prev => [...prev, msg])
        socket.on("receive-message", onMessage)
        return () => socket.off("receive-message", onMessage)
    }, [socket])

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
        <div className="flex flex-col h-full border-l border-white/8" style={{ background: "#0d0f1c" }}>
            <div className="px-4 py-3 border-b border-white/8 shrink-0">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chat</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-2xl mb-2">💬</p>
                        <p className="text-xs text-gray-600">No messages yet. Say something!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender?._id === currentUser?._id ||
                                     msg.sender?._id === currentUser?.id
                        return (
                            <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                                    {isMe ? "You" : (msg.sender?.name ?? "Unknown")}
                                </span>
                                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                                    isMe
                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                        : "bg-white/8 text-gray-200 rounded-bl-sm"
                                }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-gray-600 mt-0.5 px-1">
                                    {formatTime(msg.createdAt)}
                                </span>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            <div className="px-3 py-3 border-t border-white/8 shrink-0">
                <div className="flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Message… (Enter to send)"
                        rows={1}
                        className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors border border-white/10"
                        style={{ background: "rgba(255,255,255,0.06)", maxHeight: "80px" }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors text-sm"
                    >
                        ↑
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Room Page ─────────────────────────────────────────────────────────────────
export default function Room() {
    const { roomId }= useParams()
    const navigate  = useNavigate()
    const { socket }= useSocket()
    const { user }  = useContext(AuthContext)

    const [roomData, setRoomData]           = useState(null)
    const [participants, setParticipants]   = useState([])
    const [language, setLanguage]           = useState("python")
    const [chatOpen, setChatOpen]           = useState(true)
    const [activeProblem, setActiveProblem] = useState(null)
    
    const [generatorOpen, setGeneratorOpen] = useState(false)
    
    const hasEdited      = useRef({})
    const localCodeCache = useRef({})
    const activeProblemRef = useRef(activeProblem)
    const languageRef      = useRef(language)
    useEffect(() => { activeProblemRef.current = activeProblem }, [activeProblem])
    useEffect(() => { languageRef.current = language }, [language])

    const editorRef      = useRef(null)
    const isRemoteUpdate = useRef(false)
    const pendingState   = useRef(null) 

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
                    setRoomData(res.data.data)
                    setParticipants(res.data.data.participants ?? [])
                }
            } catch {
                if (!cancelled) navigate("/dashboard")
            }
        }
        load()
        return () => { cancelled = true }
    }, [roomId, navigate])

    // 1. MASTER SOCKET LISTENER
    useEffect(() => {
        if (!socket) return
        socket.on("room-state", (state) => {
            if (state?.codes) {
                localCodeCache.current = state.codes
                const currProblem = activeProblemRef.current;
                const currLang = languageRef.current;
                if (currProblem && editorRef.current && state.codes[currProblem._id]?.[currLang] !== undefined) {
                    isRemoteUpdate.current = true
                    editorRef.current.setValue(state.codes[currProblem._id][currLang])
                    setTimeout(() => { isRemoteUpdate.current = false }, 0)
                }
                if(state?.endTime) {
                    setEndTime(state.endTime)
                }
                if (state?.activeProblemId && roomData?.problems) {
                    const currentProb = roomData.problems.find(p => p._id === state.activeProblemId)
                    if (currentProb) {
                        setActiveProblem(currentProb)
                        setSelectedProblem(currentProb)
                    }
                }
            }
        })
        socket.on("timer-started", ({ endTime }) => {
                setEndTime(endTime)
        })

        socket.on("receive-hint", ({ hint }) => setCurrentHint(hint))

        socket.on("code-update", ({ problemId, language: updateLang, code }) => {
            const currProblem = activeProblemRef.current;
            const currLang = languageRef.current;
            
            if (!localCodeCache.current[problemId]) localCodeCache.current[problemId] = {};
            localCodeCache.current[problemId][updateLang] = code;
            
            const isSameProblem = currProblem && String(currProblem._id) === String(problemId);
            
            if (isSameProblem && currLang === updateLang && editorRef.current) {
                if (editorRef.current.getValue() !== code) {
                    isRemoteUpdate.current = true;
                    const position = editorRef.current.getPosition();
                    editorRef.current.setValue(code ?? "");
                    if (position) editorRef.current.setPosition(position);
                    setTimeout(() => { isRemoteUpdate.current = false }, 0);
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
            if (!activeProblemRef.current && updatedRoomData.problems?.length > 0) {
            const first = updatedRoomData.problems[0]
            setActiveProblem(first)
            setSelectedProblem(first)
            }
        })

        socket.on("interview-ended", () => {
            setRoomData(prev => ({ ...prev, status: "ended" }));
            alert("The interviewer has concluded this session. The editor is now locked.");
        })

        socket.on("cheat-warning", ({ message }) => {
            if (user?.role === "interviewer") {
                alert(message); 
            }
        })
        return () => {
            socket.off("room-state")
            socket.off("code-update")
            socket.off("language-update")
            socket.off("room-updated")
            socket.off("interview-ended")
            socket.off("cheat-warning")
        }
    }, [socket, roomData])

    // 2. THE SWAPPER
    useEffect(() => {
        if (!activeProblem || !editorRef.current) return;

        const pId = String(activeProblem._id);
        const savedCode = localCodeCache.current[pId]?.[language];

        isRemoteUpdate.current = true;

        if (savedCode !== undefined) {
            editorRef.current.setValue(savedCode);
        } else {
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
        setTimeout(() => { isRemoteUpdate.current = false }, 0);
    }, [activeProblem, language]);

    // Join socket room
    useEffect(() => {
        if (!socket || !roomId || !roomData) return
        socket.emit("join-room", roomId)
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
    }, [socket, roomId, roomData, user])

    // Countdown timer
    useEffect(()=>{
        if(!endTime) return
        const interval= setInterval(()=>{
            const remaining= endTime- Date.now()
            
            if(remaining <= 0){
                clearInterval(interval)
                setTimeLeft("00:00")
                return
            }  

            const minutes= Math.floor(remaining / 60000).toString()
            const seconds= Math.floor((remaining % 60000) / 1000).toString() 
            const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            setTimeLeft(formattedTime)
        },1000)

        return ()=> clearInterval(interval)
    },[endTime])

    const handleEditorDidMount = useCallback((editor) => {
        editorRef.current = editor
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
    }, [])
  
    const handleEditorChange = (value) => {
        const currProblem = activeProblemRef.current;
        const currLang = languageRef.current;
        
        if (isRemoteUpdate.current || !currProblem) return;
        
        if (!hasEdited.current[currProblem._id]) hasEdited.current[currProblem._id] = {};
        hasEdited.current[currProblem._id][currLang] = true;
        
        if (!localCodeCache.current[currProblem._id]) localCodeCache.current[currProblem._id] = {};
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

    useEffect(() => {
        if (roomData?.problems && roomData.problems.length > 0) {
            setSelectedProblem(roomData.problems[0])
        }
    }, [roomData])
    
    useEffect(() => {
        console.log("🔍 roomData.problems:", roomData?.problems)
        console.log("🔍 activeProblem:", activeProblem)
        if (roomData?.problems && roomData.problems.length > 0 && !activeProblem) {
            const firstProblem = roomData.problems[0]
            console.log("✅ Setting firstProblem:", firstProblem)
            setActiveProblem(firstProblem)
            setSelectedProblem(firstProblem)
        }
    }, [roomData?.problems, activeProblem])

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

    useEffect(() => {
        if (roomData?.problems && roomData.problems.length > 0 && !activeProblem) {
            const firstProblem = roomData.problems[0]
            setActiveProblem(firstProblem)
            setSelectedProblem(firstProblem)
        }
    }, [roomData?.problems, activeProblem])

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

    const [isExecuting, setIsExecuting] = useState(false)
    const [executionResults, setExecutionResults] = useState(null)
    const [executionError, setExecutionError] = useState(null)

    const handleRunCode = async () => {
        const currentCode = editorRef.current ? editorRef.current.getValue() : "";
        if (!currentCode.trim()) {
            setExecutionError("Cannot submit empty code.");
            return;
        }
        const languageMap = { cpp: 54, java: 62, python: 71 };
        const mappedLangId = languageMap[language];

        if (!mappedLangId) {
            setExecutionError(`Execution not supported for language: ${language}`);
            return;
        }

        if (!selectedProblem) {
            setExecutionError("Please select a problem first");
            return;
        }

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionResults(null);
        try {
            const response = await runCodeService(roomId, mappedLangId, currentCode, selectedProblem._id);
            setExecutionResults(response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Execution Server Offline";
            setExecutionError(errorMessage);
        } finally {
            setIsExecuting(false);
        }
    }

    if (!roomData) {
        return (
            <div className="flex min-h-screen items-center justify-center text-gray-300" style={{ background: "#0b0d1a" }}>
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading space…</p>
                </div>
            </div>
        )
    }

    const sharing     = shouldShareEditor(roomData)
    const currentLang = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0]
    const isInterviewer = roomData.type === "interview_room" && user?.role === "interviewer"

    return (
        <div className="flex flex-col text-gray-100" style={{ height: "100vh", background: "#0b0d1a" }}>

            {/* ── Header ── */}
            <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-2.5"
                style={{ background: "rgba(11,13,26,0.95)", backdropFilter: "blur(12px)" }}>

                {/* Left: room name + badges */}
                <div className="min-w-0 flex items-center gap-3">
                    <div>
                        <h1 className="text-base font-bold text-white truncate leading-tight">{roomData.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border"
                                style={roomData.type === "interview_room"
                                    ? { color: "#a5b4fc", borderColor: "rgba(165,180,252,0.3)", background: "rgba(99,102,241,0.15)" }
                                    : { color: "#5eead4", borderColor: "rgba(94,234,212,0.3)", background: "rgba(20,184,166,0.15)" }
                                }>
                                {roomData.type === "interview_room" ? "Interview" : "Collab"}
                            </span>
                            <span className="text-[11px] text-gray-500">
                                Shared Editor · <span className="capitalize">{roomData.status}</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2 shrink-0">

                    {/* Avatar stack + online count */}
                    <AvatarStack participants={participants} />

                    {/* Timer */}
                    {endTime && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                            timeLeft === "00:00"
                                ? "border-red-500/40 text-red-400"
                                : "border-white/10 text-gray-200"
                        }`} style={{ background: timeLeft === "00:00" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)" }}>
                            ⏱ {timeLeft}
                        </div>
                    )}

                    {/* Chat toggle */}
                    <button
                        onClick={() => setChatOpen(o => !o)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                            chatOpen
                                ? "border-indigo-500/40 text-indigo-300"
                                : "border-white/10 text-gray-400 hover:text-white"
                        }`}
                        style={{ background: chatOpen ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)" }}
                    >
                        💬 Chat
                    </button>

                    {/* Copy Link */}
                    <button
                        onClick={() => navigator.clipboard.writeText(roomData.inviteLink)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-400 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                        🔗 Copy Link
                    </button>

                    {/* Leave */}
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/10 text-gray-400 hover:text-white transition-colors"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                        Leave
                    </button>

                    {/* End Session — interviewer only */}
                    {isInterviewer && roomData.status !== "ended" && (
                        <button
                            onClick={async () => {
                                if (window.confirm("End this interview?")) {
                                    try {
                                        console.log("Sending end-session request...");
                                        const res = await api.put(`/rooms/${roomId}/end`, {
                                            finalCache: localCodeCache.current,
                                            interviewerNotes: interviewerNotes
                                        });
                                        console.log("Response received:", res.data);
                                        const room = res.data.data.room || res.data.data;
                                        const sId = res.data.data.sessionId;
                                        setRoomData(room);
                                        socket.emit("trigger-end-session", { roomId });
                                        setFeedbackSessionId(sId);
                                        console.log("Session ID set:", sId);
                                    } catch (err) {
                                        console.error("API Error Details:", err.response?.data || err.message);
                                        alert("Error: " + (err.response?.data?.message || "Unknown error"));
                                    }
                                }
                            }}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all border border-red-500/40"
                            style={{ background: "rgba(239,68,68,0.2)" }}
                        >
                            🛑 End Session
                        </button>
                    )}
                </div>
            </header>

            {/* ── Body: Problem | Editor | Chat | Interviewer Panel ── */}
            <div className="flex flex-1 min-h-0">

                {/* Problem Statement Panel */}
                {activeProblem && (
                    <div className="w-80 shrink-0 flex flex-col min-h-0 py-3 pl-3">
                        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/8 p-4 text-sm text-gray-300 custom-scrollbar"
                            style={{ background: "#13152a" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Problem Statement</p>
                            <h2 className="text-lg font-bold text-white mb-4">{activeProblem.title || ""}</h2>
                            
                            <div className="prose prose-invert max-w-none">
                                <p className="whitespace-pre-wrap leading-relaxed text-gray-300">
                                    {activeProblem.statement}
                                </p>
                                
                                {activeProblem.examples && activeProblem.examples.length > 0 && (
                                    <div className="mt-6 space-y-3">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h3>
                                        {activeProblem.examples.map((ex, i) => (
                                            <div key={i} className="rounded-lg border border-white/8 font-mono text-xs p-3"
                                                style={{ background: "#0b0d1a" }}>
                                                <p><span className="text-indigo-400">Input:</span> {ex.input}</p>
                                                <p className="mt-1"><span className="text-green-400">Output:</span> {ex.output}</p>
                                                {ex.explanation && (
                                                    <p className="mt-1 text-gray-500">// {ex.explanation}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeProblem.constraints && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Constraints</h3>
                                        <div className="flex flex-wrap gap-1">
                                            {activeProblem.constraints.map((c, i) => (
                                                <span key={i} className="font-mono text-xs px-2 py-0.5 rounded border border-white/10 text-gray-400"
                                                    style={{ background: "#0b0d1a" }}>
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Editor Column ── */}
                <div className="flex flex-col flex-1 min-w-0 p-3 gap-2">

                    {/* Editor toolbar */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Problem selector */}
                        {roomData?.problems && roomData.problems.length > 0 && (
                            <select
                                value={selectedProblem?._id || ""}
                                onChange={handleProblemChange}
                                className="flex-1 max-w-[200px] text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 border border-white/10 text-gray-200 cursor-pointer transition-colors"
                                style={{ background: "#13152a" }}
                            >
                                <option value="">Select Problem</option>
                                {roomData.problems.map(p => (
                                    <option key={p._id} value={p._id}>{p.title}</option>
                                ))}
                            </select>
                        )}

                        {/* Language selector */}
                        <select
                            value={language}
                            onChange={handleLanguageChange}
                            disabled={roomData.status === "ended"}
                            className="text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-40 cursor-pointer border border-white/10 text-gray-200"
                            style={{ background: "#13152a" }}
                        >
                            {LANGUAGES.map(l => (
                                <option key={l.value} value={l.value}>{l.label}</option>
                            ))}
                        </select>

                        <div className="flex-1" />

                        {/* AI Generate — interviewer only */}
                        {isInterviewer && (
                            <button
                                onClick={() => setGeneratorOpen(true)}
                                disabled={roomData.status === "ended"}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 border border-indigo-500/30"
                                style={{ background: "rgba(99,102,241,0.2)" }}
                            >
                                ✨ AI Generate
                            </button>
                        )}

                        {/* Run Code */}
                        {activeProblem && (
                            <button
                                onClick={handleRunCode}
                                disabled={isExecuting || roomData.status === "ended"}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all ${
                                    isExecuting
                                        ? "opacity-60 cursor-not-allowed"
                                        : "hover:opacity-90"
                                }`}
                                style={{ background: isExecuting ? "#374151" : "linear-gradient(135deg, #10b981, #059669)", boxShadow: isExecuting ? "none" : "0 2px 12px rgba(16,185,129,0.3)" }}
                            >
                                ▶ {isExecuting ? "Executing..." : "Run Code"}
                            </button>
                        )}
                    </div>

                    {/* Hint toast for candidate */}
                    {currentHint && user?.role !== "interviewer" && (
                        <div className="absolute top-4 right-4 z-50 w-80 shadow-2xl rounded-xl overflow-hidden border border-indigo-500/40"
                            style={{ background: "#1e2340" }}>
                            <div className="px-4 py-2 border-b border-indigo-500/20 flex justify-between items-center"
                                style={{ background: "rgba(99,102,241,0.2)" }}>
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">💡 Hint from Interviewer</span>
                                <button onClick={() => setCurrentHint(null)} className="text-indigo-400 hover:text-white">✕</button>
                            </div>
                            <div className="p-4 text-sm text-gray-200 leading-relaxed">
                                {currentHint}
                            </div>
                        </div>
                    )}

                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden rounded-xl border border-white/8" style={{ minHeight: 0, background: "#1e1e1e" }}>
                        <Editor
                            height="100%"
                            width="100%"
                            theme="vs-dark"
                            language={language}
                            path={`room-${roomId}.${currentLang.ext}`}
                            defaultValue={DEFAULT_BOILERPLATE}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                readOnly: roomData.status === "ended",
                                fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                fontLigatures: true,
                            }}
                        />
                    </div>

                    {/* Status bar */}
                    <div className="flex items-center gap-4 px-1">
                        {!sharing && (
                            <p className="text-[11px] text-amber-500/80">⚔️ Compete mode — your code is private</p>
                        )}
                        {roomData.status === "ended" && (
                            <p className="text-[11px] text-gray-500">Session ended · Editor is read-only</p>
                        )}
                        <p className="text-[11px] text-gray-600 ml-auto">{currentLang.label}</p>
                    </div>

                    {/* Execution results */}
                    {(executionResults || executionError || isExecuting) && (
                        <div className="h-1/3 min-h-[200px] mt-2 overflow-y-auto rounded-xl border border-white/8 p-4 text-sm font-mono custom-scrollbar"
                            style={{ background: "#0d0f1c" }}>
                            <div className="flex justify-between items-center mb-4 border-b border-white/8 pb-2">
                                <h3 className="text-gray-300 font-bold tracking-wider text-xs uppercase">Terminal / Output</h3>
                                <button 
                                    onClick={() => { setExecutionResults(null); setExecutionError(null); }}
                                    className="text-gray-500 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {isExecuting && (
                                <div className="flex items-center text-indigo-400 gap-2">
                                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    Executing against hidden test cases...
                                </div>
                            )}

                            {executionError && (
                                <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-900/40">
                                    <span className="font-bold">Error:</span> {executionError}
                                </div>
                            )}

                            {executionResults && executionResults.map((result, index) => (
                                <div key={index} className="mb-4 rounded-lg p-3 border border-white/8" style={{ background: "rgba(255,255,255,0.03)" }}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400 font-bold text-xs">Test Case {index + 1}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                            result.passed ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"
                                        }`}>
                                            {result.status}
                                        </span>
                                    </div>
                                    
                                    {!result.passed && (
                                        <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                                            <div>
                                                <div className="text-gray-500 mb-1">Expected Output:</div>
                                                <div className="p-2 rounded text-green-400/80 whitespace-pre-wrap border border-white/8" style={{ background: "#0b0d1a" }}>
                                                    {result.expectedOutput}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 mb-1">Your Output:</div>
                                                <div className="p-2 rounded text-red-400/80 whitespace-pre-wrap border border-white/8" style={{ background: "#0b0d1a" }}>
                                                    {result.actualOutput || "<empty string>"}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat sidebar */}
                {chatOpen && (
                    <div className="w-72 shrink-0 flex flex-col min-h-0 py-3 pr-3">
                        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-white/8">
                            <ChatPanel roomId={roomId} socket={socket} currentUser={user} />
                        </div>
                    </div>
                )}

                {/* Interviewer Private Panel */}
                {isInterviewer && (
                    <div className="w-80 shrink-0 flex flex-col min-h-0 py-3 pr-3">
                        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-white/8 flex flex-col"
                            style={{ background: "#13152a" }}>
                            <div className="px-4 py-3 border-b border-white/8 shrink-0"
                                style={{ background: "rgba(139,92,246,0.1)" }}>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Interviewer Panel</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Timer Control */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Interview Timer</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={timerInput}
                                            onChange={(e) => setTimerInput(e.target.value)}
                                            className="w-20 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none border border-white/10"
                                            style={{ background: "rgba(255,255,255,0.06)" }}
                                            placeholder="Mins"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (!timerInput || isNaN(timerInput)) return;
                                                socket.emit("start-timer", { roomId, durationMinutes: Number(timerInput) });
                                            }}
                                            className="flex-1 rounded-lg text-sm font-bold transition-colors text-white"
                                            style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                                        >
                                            Start Timer
                                        </button>
                                    </div>
                                </div>

                                {/* Hint Sender */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Push Hint</label>
                                    <textarea 
                                        value={hintInput}
                                        onChange={(e) => setHintInput(e.target.value)}
                                        placeholder="Type a hint..."
                                        className="w-full rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-none h-20 border border-white/10"
                                        style={{ background: "rgba(255,255,255,0.06)" }}
                                    />
                                    <button 
                                        onClick={() => {
                                            if (!hintInput.trim()) return;
                                            socket.emit("send-hint", { roomId, hint: hintInput.trim() });
                                            setHintInput(""); 
                                        }}
                                        className="w-full py-2 rounded-lg text-sm font-bold text-gray-300 transition-colors border border-white/10 hover:border-white/20 hover:text-white"
                                        style={{ background: "rgba(255,255,255,0.05)" }}
                                    >
                                        Send Hint
                                    </button>
                                </div>

                                {/* Private Notes */}
                                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Private Evaluation Notes</label>
                                    <textarea 
                                        value={interviewerNotes}
                                        onChange={(e) => setInterviewerNotes(e.target.value)}
                                        placeholder="Candidate is struggling with the nested loop..."
                                        className="w-full flex-1 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-none border border-white/10"
                                        style={{ background: "rgba(255,255,255,0.06)" }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Problem Generator Modal */}
            <ProblemGeneratorModal
                isOpen={generatorOpen}
                onClose={() => setGeneratorOpen(false)}
                onProblemGenerated={(updatedRoomData) => {
                    setRoomData(updatedRoomData);
                    const newProblem = updatedRoomData.problems[updatedRoomData.problems.length - 1];
                    setActiveProblem(newProblem);
                    setSelectedProblem(newProblem);
                    if (socket) {
                        socket.emit("notify-new-problem", { 
                            roomId, 
                            updatedRoomData 
                        });
                    }
                }}
                socket={socket}
                roomId={roomId}
            />

            {/* Feedback Modal */}
            <FeedbackModal 
                isOpen={!!feedbackSessionId}
                onSubmit={handleFeedbackSubmit} 
                isSubmitting={isSubmittingFeedback} 
            />
        </div>
    )
}