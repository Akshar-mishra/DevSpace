import { useEffect, useState, useRef, useCallback, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Editor from "@monaco-editor/react"
import { useSocket } from "../context/SocketContext"
import { AuthContext } from "../context/AuthContext"
import api from "../services/api"
import { runCodeService } from "../services/code.service.js"
import { generateProblem } from "../services/problem.service.js"
import ProblemGeneratorModal from "../components/ProblemGeneratorModal";

const DEFAULT_BOILERPLATE = "// Write your solution here\n"

const LANGUAGES = [
    { value: "python",     label: "Python",     ext: "py" },
    { value: "java",       label: "Java",       ext: "java" },
    { value: "cpp",        label: "C++",        ext: "cpp" },
]

function shouldShareEditor(room) {
    if (!room) return true
    if (room.type === "interview_room") return true
    if (room.type === "friendly_room" && room.mode === "collab") return true
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
    const { roomId }        = useParams()
    const navigate          = useNavigate()
    const { socket }        = useSocket()
    const { user }          = useContext(AuthContext)

    const [roomData, setRoomData]           = useState(null)
    const [participants, setParticipants]   = useState([])
    const [language, setLanguage]           = useState("python")
    const [chatOpen, setChatOpen]           = useState(true)
    const [activeProblem, setActiveProblem] = useState(null)
    const [generatorOpen, setGeneratorOpen] = useState(false)
    
    const hasEdited      = useRef({ cpp: false, java: false, python: false })

    const editorRef      = useRef(null)
    const isRemoteUpdate = useRef(false)
    const pendingState   = useRef(null) 

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


    // Master Socket Listener (Data fetching only, no UI side-effects here)
    useEffect(() => {
        if (!socket) return
        socket.on("room-state", (state) => {
            if (state.language){
                setLanguage(state.language)
            }
            if (state.code) {
                if (editorRef.current){
                     editorRef.current.setValue(state.code)
                }
                else pendingState.current = state.code
            }
            if (state.problem) setActiveProblem(state.problem)
        })

        socket.on("sync-problem", (problem) => {
            console.log("✅ SYNC-PROBLEM received:", problem)
            setActiveProblem(problem)
        })
        
        socket.on("problem-error", (err) => {
            console.error("Problem Error:", err.message)
            // TODO: Replace with Toast Notification later
        })

        return () => {
            socket.off("room-state")
            socket.off("sync-problem")
            socket.off("problem-error")
        }
    }, [socket])

    // Boilerplate Injector Hook
    useEffect(() => {
        if (activeProblem && activeProblem.boilerplates) {
            const boilerplateCode = activeProblem.boilerplates[language]
            
            // Only inject if it exists AND the user hasn't typed in this language yet
            if (boilerplateCode && !hasEdited.current[language]) {
                if (editorRef.current) {
                    isRemoteUpdate.current = true // Prevent emitting to socket
                    editorRef.current.setValue(boilerplateCode)
                    setTimeout(() => { isRemoteUpdate.current = false }, 0)
                } else {
                    pendingState.current = boilerplateCode
                }
            }
        }
    }, [activeProblem, language])

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

    // Remote code sync
    useEffect(() => {
        if (!socket) return
        const onCodeUpdate = (newCode) => {
            if (!shouldShareEditor(roomData) || !editorRef.current) return
            isRemoteUpdate.current = true
            const position  = editorRef.current.getPosition()
            const model     = editorRef.current.getModel()
            const fullRange = model?.getFullModelRange()
            if (fullRange) {
                editorRef.current.executeEdits("remote-sync", [{ range: fullRange, text: newCode ?? "" }])
            } else {
                editorRef.current.setValue(newCode ?? "")
            }
            if (position) editorRef.current.setPosition(position)
            setTimeout(() => { isRemoteUpdate.current = false }, 0)
        }
        socket.on("code-update", onCodeUpdate)
        return () => socket.off("code-update", onCodeUpdate)
    }, [socket, roomData])

    // Remote language sync
    useEffect(() => {
        if (!socket) return
        socket.on("language-update", setLanguage)
        return () => socket.off("language-update", setLanguage)
    }, [socket])

    const handleEditorDidMount = useCallback((editor) => {
        editorRef.current = editor
        // If room-state arrived before editor mounted, apply it now
        if (pendingState.current) {
            editor.setValue(pendingState.current)
            pendingState.current = null
        }
    }, [])

    const handleEditorChange = (value) => {
        if (isRemoteUpdate.current) return
        hasEdited.current[language] = true 
        if (!socket || !roomId || !shouldShareEditor(roomData)) return  
        socket.emit("code-change", { roomId, code: value ?? "" })   
    }    

    const handleLanguageChange = (e) => {
        const lang = e.target.value
        setLanguage(lang)
        if (socket && roomId) socket.emit("language-change", { roomId, language: lang })
    }


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

        setIsExecuting(true);
        setExecutionError(null);
        setExecutionResults(null);
        try {
            const response = await runCodeService(roomId, mappedLangId, currentCode);
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

    console.log("=== ROOM DEBUG ===")
    console.log("roomData:", roomData)
    console.log("user:", user)
    console.log("roomData.type === 'interview_room':", roomData?.type === "interview_room")
    console.log("user?.role === 'interviewer':", user?.role === "interviewer")
    console.log("SHOW BUTTON?:", roomData?.type === "interview_room" && user?.role === "interviewer")

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

                    {/* Online count */}
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 rounded-full border border-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-[11px] text-gray-400">{participants.length} online</span>
                    </div>

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
            </div>

            {/* Problem Generator Modal */}
            <ProblemGeneratorModal
                isOpen={generatorOpen}
                onClose={() => setGeneratorOpen(false)}
                onProblemGenerated={() => {
                    console.log("Problem generated and synced to room");
                }}
                socket={socket}
                roomId={roomId}
            />
        </div>
    )
}