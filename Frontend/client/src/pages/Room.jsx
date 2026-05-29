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

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ roomId, socket, currentUser }) {
    const [messages, setMessages] = useState([])
    const [input, setInput]       = useState("")
    const [loading, setLoading]   = useState(false)
    const bottomRef               = useRef(null)

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return
        const onMessage = (msg) => setMessages(prev => [...prev, msg])
        socket.on("receive-message", onMessage)
        return () => socket.off("receive-message", onMessage)
    }, [socket])

    // Auto-scroll
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
        <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800">
            <div className="px-4 py-3 border-b border-gray-800 shrink-0">
                <h2 className="text-sm font-semibold text-gray-300 tracking-wide">Chat</h2>
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
                                        ? "bg-blue-600 text-white rounded-br-sm"
                                        : "bg-gray-800 text-gray-200 rounded-bl-sm"
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

            <div className="px-3 py-3 border-t border-gray-800 shrink-0">
                <div className="flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Message… (Enter to send)"
                        rows={1}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                        style={{ maxHeight: "80px" }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl transition-colors text-sm"
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
    
    const hasEdited      = useRef({}) // Tracks edits per problem: { [problemId]: { python: true } }
    const localCodeCache = useRef({}) // Stores code for ALL problems in the background
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

    // Interviewer Panel State
    const [interviewerNotes, setInterviewerNotes] = useState("");
    const [hintInput, setHintInput] = useState("");
    const [timerInput, setTimerInput] = useState("45");

    //feedback
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
                if (currProblem && editorRef.current && state.codes[currProblem._id] !== undefined) {
                    isRemoteUpdate.current = true
                    editorRef.current.setValue(state.codes[currProblem._id])
                    setTimeout(() => { isRemoteUpdate.current = false }, 0)
                }

                //for timer
                if(state?.endTime) {
                    setEndTime(state.endTime)
                }
            }
        })

        socket.on("timer-started", ({ endTime }) => {
                setEndTime(endTime)
        })

        //hint sys
        socket.on("receive-hint", ({ hint }) => setCurrentHint(hint))

        socket.on("code-update", ({ problemId, code }) => {
            const currProblem = activeProblemRef.current;
            localCodeCache.current[problemId] = code;
            
            const isSameProblem = currProblem && String(currProblem._id) === String(problemId);
            
            if (isSameProblem && editorRef.current) {
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

        socket.on("room-updated", (updatedRoomData) => setRoomData(updatedRoomData))

        socket.on("interview-ended", () => {
            setRoomData(prev => ({ ...prev, status: "ended" }));
            alert("The interviewer has concluded this session. The editor is now locked.");
        })

        // Catch Anti-Cheat warnings
        socket.on("cheat-warning", ({ message }) => {
            if (user?.role === "interviewer") {
                // You can use your custom toast here, or a harsh alert
                alert(message); 
            }
        });

        return () => {
            socket.off("room-state")
            socket.off("code-update")
            socket.off("language-update")
            socket.off("room-updated")
            socket.off("interview-ended")
            socket.off("cheat-warning")
        }
    }, [socket, roomData])

    // 2. THE SWAPPER (Handles switching questions safely)
    useEffect(() => {
        if (!activeProblem || !editorRef.current) return;

        const pId = String(activeProblem._id);
        const savedCode = localCodeCache.current[pId];

        isRemoteUpdate.current = true; // Block socket emits while changing UI

        if (savedCode !== undefined) {
            editorRef.current.setValue(savedCode);
        } else {
            const boilerplate = activeProblem.boilerplates?.[language] || DEFAULT_BOILERPLATE;
            if (!hasEdited.current[pId]?.[language]) {
                editorRef.current.setValue(boilerplate);
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
        const onJoined = ({ userId }) =>
            setParticipants(prev => prev.some(p => (p._id ?? p) === userId) ? prev : [...prev, { _id: userId }])
        const onLeft = ({ userId }) =>
            setParticipants(prev => prev.filter(p => (p._id ?? p) !== userId))
        socket.on("user-joined", onJoined)
        socket.on("user-left", onLeft)
        return () => { socket.off("user-joined", onJoined); socket.off("user-left", onLeft) }
    }, [socket])

// 🚨 ANTI-CHEAT: Tab Switching Detection
    useEffect(() => {
        if (!socket || !roomId || roomData?.status === "ended") return;
        
        // We only want to track the candidate, not the interviewer!
        if (user?.role === "interviewer") return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // The candidate just switched tabs or minimized!
                socket.emit("tab-switched", { 
                    roomId, 
                    candidateName: user?.name || "Candidate" 
                });
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [socket, roomId, roomData, user])

    //countdown timer effect
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
        // If room-state arrived before editor mounted, apply it now
        if (pendingState.current) {
            editor.setValue(pendingState.current)
            pendingState.current = null
        }
    }, [])
  
    const handleEditorChange = (value) => {
        const currProblem = activeProblemRef.current;
        const currLang = languageRef.current;
        
        if (isRemoteUpdate.current || !currProblem) return;
        
        if (!hasEdited.current[currProblem._id]) hasEdited.current[currProblem._id] = {};
        hasEdited.current[currProblem._id][currLang] = true;
        
        localCodeCache.current[currProblem._id] = value;
        
        if (socket && roomId && shouldShareEditor(roomData)) {
            socket.emit("code-change", { roomId, problemId: currProblem._id, code: value ?? "" });
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

    //showing candidate problems
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
            // Call the exact service you just built
            await submitSessionFeedback(feedbackSessionId, formData);
            
            // Success! Now we can safely leave the room.
            navigate("/dashboard");
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            alert(error.response?.data?.message || "Failed to submit feedback. Try again.");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    
    // Running code
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
            <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading space…</p>
                </div>
            </div>
        )
    }

    const sharing     = shouldShareEditor(roomData)
    const currentLang = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0]

    return (
        <div className="flex flex-col bg-gray-950 text-gray-100" style={{ height: "100vh" }}>

            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-2.5 bg-gray-950/90 backdrop-blur">
                <div className="min-w-0">
                    <h1 className="text-base font-semibold text-blue-400 truncate leading-tight">{roomData.name}</h1>
                    <p className="text-[11px] text-gray-500 leading-tight">
                        {roomData.type === "friendly_room" ? `Friendly · ${roomData.mode ?? "—"}` : "Interview"}
                        {" · "}{sharing ? "Shared" : "Solo"}
                        {" · "}<span className="capitalize">{roomData.status}</span>
                    </p>
                </div>
                

                <div className="flex items-center gap-2 shrink-0">
                    {/* Language selector */}
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        disabled={roomData.status === "ended"}
                        className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                        {LANGUAGES.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                    </select>

                    {roomData?.problems && roomData.problems.length > 0 && (
                        <select
                            value={selectedProblem?._id || ""}
                            onChange={handleProblemChange}
                            className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Select Problem</option>
                            {roomData.problems.map(p => (
                                <option key={p._id} value={p._id}>
                                    {p.title}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Online count */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 rounded-full border border-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] text-gray-400">{participants.length} online</span>
                    </div>

                    {/* ⏱ THE TIMER GOES HERE */}
                    {endTime && (
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border font-mono font-bold text-sm ${
                            timeLeft === "00:00" ? "bg-red-900/30 border-red-500/50 text-red-400" : "bg-gray-800 border-gray-700 text-gray-200"
                        }`}>
                            ⏱ {timeLeft}
                        </div>
                    )}

                    {/* Invite code */}
                    <button
                        onClick={() => navigator.clipboard.writeText(roomData.inviteLink)}
                        title="Copy invite code"
                        className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 rounded-full border border-gray-700 text-[11px] text-gray-400 transition-colors"
                    >
                        🔗 {roomData.inviteLink}
                    </button>

                    {/* Chat toggle */}
                    <button
                        onClick={() => setChatOpen(o => !o)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            chatOpen
                                ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                        }`}
                    >
                        💬 Chat
                    </button>
                    

                    <button
                        onClick={() => navigate("/dashboard")}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-200 transition-colors"
                    >
                        Leave
                    </button>

                    {/* GENERATE PROBLEM BUTTON - Only show for interviewer in interview rooms */}
                    {roomData.type === "interview_room" && user?.role === "interviewer" && (
                        <button
                            onClick={() => setGeneratorOpen(true)}
                            disabled={roomData.status === "ended"}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all ${
                                roomData.status === "ended"
                                    ? "bg-gray-600 cursor-not-allowed opacity-50"
                                    : "bg-purple-600 hover:bg-purple-500 shadow-lg hover:shadow-purple-900/50"
                            }`}
                            title="Generate a new problem via AI"
                        >
                            ✨ Generate Problem
                        </button>
                    )}

                    {/* RUN CODE BUTTON */}
                    {activeProblem && (
                        <button
                            onClick={handleRunCode}
                            disabled={isExecuting || roomData.status === "ended"}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow transition-all ${
                                isExecuting 
                                    ? "bg-gray-600 cursor-not-allowed opacity-70" 
                                    : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-900/50"
                            }`}
                        >
                            {isExecuting ? "Executing..." : "▶ Run Code"}
                        </button>
                    )}

                    {/* END SESSION BUTTON - Only for Interviewer */}
                    {roomData.type === "interview_room" && user?.role === "interviewer" && roomData.status !== "ended" && (
                        <button
                            onClick={async () => {
                                if (window.confirm("End this interview?")) {
                                    try {
                                        console.log("Sending end-session request...");
                                        
                                        const res = await api.put(`/rooms/${roomId}/end`, {
                                            finalCache: localCodeCache.current,
                                            interviewerNotes: interviewerNotes
                                        });

                                        console.log("Response received:", res.data); // 👈 THIS IS THE TRUTH

                                        // Patch: Be defensive. If res.data.data.room is undefined, 
                                        // maybe it's just res.data.data?
                                        const room = res.data.data.room || res.data.data;
                                        const sId = res.data.data.sessionId;

                                        setRoomData(room);
                                        socket.emit("trigger-end-session", { roomId });
                                        setFeedbackSessionId(sId);
                                        
                                        console.log("Session ID set:", sId);
                                    } catch (err) {
                                        // This will catch the EXACT reason it's failing
                                        console.error("API Error Details:", err.response?.data || err.message);
                                        alert("Error: " + (err.response?.data?.message || "Unknown error"));
                                    }
                                }
                            }}
                            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow hover:shadow-red-900/50 transition-all"
                        >
                            🛑 End Session
                        </button>
                    )}
                </div>
            </header>

            {/* Editor + Chat */}
            <div className="flex flex-1 min-h-0">

                {/* Problem Statement Panel (Only visible if a problem exists) */}
                {activeProblem && (
                    <div className="w-80 shrink-0 flex flex-col min-h-0 py-3 pl-3">
                        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-gray-800 bg-[#1e1e1e] p-4 text-sm text-gray-300 custom-scrollbar">
                            <h2 className="text-lg font-bold text-white mb-4">Problem Statement</h2>
                            
                            <div className="prose prose-invert max-w-none">
                                <p className="whitespace-pre-wrap leading-relaxed">
                                    {activeProblem.statement}
                                </p>
                                
                                {activeProblem.examples && activeProblem.examples.length > 0 && (
                                    <div className="mt-6 space-y-4">
                                        <h3 className="text-md font-semibold text-white">Examples</h3>
                                        {activeProblem.examples.map((ex, i) => (
                                            <div key={i} className="bg-gray-900 p-3 rounded-lg border border-gray-700 font-mono text-xs">
                                                <p><span className="text-blue-400">Input:</span> {ex.input}</p>
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
                                        <h3 className="text-md font-semibold text-white mb-2">Constraints</h3>
                                        <ul className="list-disc pl-5 space-y-1 text-gray-400">
                                            {activeProblem.constraints.map((c, i) => (
                                                <li key={i} className="font-mono text-xs bg-gray-800 inline-block px-2 py-0.5 rounded m-1">
                                                    {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Editor */}
                <div className="flex flex-col flex-1 min-w-0 p-3 gap-2 ">

                        {/* 💡 CANDIDATE HINT TOAST GOES HERE */}
                        {currentHint && user?.role !== "interviewer" && (
                            <div className="absolute top-4 right-4 z-50 w-80 bg-blue-900 border border-blue-500 shadow-2xl rounded-xl overflow-hidden animate-fade-in">
                                <div className="bg-blue-950 px-4 py-2 border-b border-blue-800 flex justify-between items-center">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">💡 Hint from Interviewer</span>
                                    <button onClick={() => setCurrentHint(null)} className="text-blue-500 hover:text-white">✕</button>
                                </div>
                                <div className="p-4 text-sm text-blue-100 leading-relaxed">
                                    {currentHint}
                                </div>
                            </div>
                        )}

                    <div className="flex-1 overflow-hidden rounded-xl border border-gray-800 bg-[#1e1e1e]" style={{ minHeight: 0 }}>
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

                    <div className="flex items-center gap-4 px-1">
                        {!sharing && (
                            <p className="text-[11px] text-amber-500/80">⚔️ Compete mode — your code is private</p>
                        )}
                        {roomData.status === "ended" && (
                            <p className="text-[11px] text-gray-500">Session ended · Editor is read-only</p>
                        )}
                        <p className="text-[11px] text-gray-600 ml-auto">{currentLang.label}</p>
                    </div>
                    {(executionResults || executionError || isExecuting) && (
                        <div className="h-1/3 min-h-[200px] mt-2 overflow-y-auto rounded-xl border border-gray-800 bg-[#121212] p-4 text-sm font-mono custom-scrollbar">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                                <h3 className="text-gray-300 font-bold tracking-wider">TERMINAL / OUTPUT</h3>
                                <button 
                                    onClick={() => { setExecutionResults(null); setExecutionError(null); }}
                                    className="text-gray-500 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {isExecuting && (
                                <div className="flex items-center text-blue-400 gap-2">
                                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    Executing against hidden test cases...
                                </div>
                            )}

                            {executionError && (
                                <div className="text-red-400 bg-red-900/20 p-3 rounded border border-red-900">
                                    <span className="font-bold">Error:</span> {executionError}
                                </div>
                            )}

                            {executionResults && executionResults.map((result, index) => (
                                <div key={index} className="mb-4 bg-gray-900/50 rounded-lg p-3 border border-gray-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400 font-bold">Test Case {index + 1}</span>
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
                                                <div className="bg-black p-2 rounded text-green-400/80 whitespace-pre-wrap">
                                                    {result.expectedOutput}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 mb-1">Your Output:</div>
                                                <div className="bg-black p-2 rounded text-red-400/80 whitespace-pre-wrap">
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
                        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-800">
                            <ChatPanel roomId={roomId} socket={socket} currentUser={user} />
                        </div>
                    </div>
                )}

                {/* 🕵️ THE INTERVIEWER PRIVATE PANEL */}
                {roomData.type === "interview_room" && user?.role === "interviewer" && (
                    <div className="w-80 shrink-0 flex flex-col min-h-0 py-3 pr-3">
                        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-gray-800 bg-gray-900 flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-800 bg-purple-900/20">
                                <h2 className="text-sm font-bold text-purple-400 tracking-wide flex items-center gap-2">
                                    Private Panel 
                                </h2>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Timer Control */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Interview Timer</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            value={timerInput}
                                            onChange={(e) => setTimerInput(e.target.value)}
                                            className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                                            placeholder="Mins"
                                        />
                                        <button 
                                            onClick={() => {
                                                if (!timerInput || isNaN(timerInput)) return;
                                                socket.emit("start-timer", { roomId, durationMinutes: Number(timerInput) });
                                            }}
                                            className="flex-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            Start Timer
                                        </button>
                                    </div>
                                </div>

                                {/* Hint Sender */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Push Hint</label>
                                    <textarea 
                                        value={hintInput}
                                        onChange={(e) => setHintInput(e.target.value)}
                                        placeholder="Type a hint..."
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-none h-20"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (!hintInput.trim()) return;
                                            socket.emit("send-hint", { roomId, hint: hintInput.trim() });
                                            setHintInput(""); 
                                        }}
                                        className="w-full py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-bold text-gray-300 transition-colors"
                                    >
                                        Send Hint
                                    </button>
                                </div>

                                {/* Private Notes */}
                                <div className="space-y-2 flex-1 flex flex-col min-h-[150px]">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Evaluation Notes</label>
                                    <textarea 
                                        value={interviewerNotes}
                                        onChange={(e) => setInterviewerNotes(e.target.value)}
                                        placeholder="Candidate is struggling with the nested loop..."
                                        className="w-full flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-none"
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
                    // 1. Instantly update the interviewer's UI
                    setRoomData(updatedRoomData);
                    
                    // 2. Select the newly added problem automatically
                    const newProblem = updatedRoomData.problems[updatedRoomData.problems.length - 1];
                    setActiveProblem(newProblem);
                    setSelectedProblem(newProblem);

                    // 3. Broadcast to the candidate so their UI updates without refreshing
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

            {/* Feedback Modal (Triggers only when session ends) */}
            <FeedbackModal 
                isOpen={!!feedbackSessionId} // Opens if feedbackSessionId is not null
                onSubmit={handleFeedbackSubmit} 
                isSubmitting={isSubmittingFeedback} 
            />
        </div>
    )
}