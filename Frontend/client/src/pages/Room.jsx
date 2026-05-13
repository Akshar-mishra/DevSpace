import { useEffect, useState, useRef, useCallback, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_BOILERPLATE = "// Write your solution here\n";

const LANGUAGES = [
    { value: "javascript", label: "JavaScript", ext: "js" },
    { value: "typescript", label: "TypeScript", ext: "ts" },
    { value: "python",     label: "Python",     ext: "py" },
    { value: "java",       label: "Java",       ext: "java" },
    { value: "cpp",        label: "C++",        ext: "cpp" },
    { value: "go",         label: "Go",         ext: "go" },
];

function shouldShareEditor(room) {
    if (!room) return true;
    if (room.type === "interview_room") return true;
    if (room.type === "friendly_room" && room.mode === "collab") return true;
    return false;
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ roomId, socket, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput]       = useState("");
    const [loading, setLoading]   = useState(true);
    const bottomRef               = useRef(null);

    // Load history on mount
    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/rooms/${roomId}/messages`);
                setMessages(res.data.data);
            } catch {
                // silent — chat starts empty
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [roomId]);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;
        const onMessage = (msg) => setMessages(prev => [...prev, msg]);
        socket.on("receive-message", onMessage);
        return () => socket.off("receive-message", onMessage);
    }, [socket]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = () => {
        const trimmed = input.trim();
        if (!trimmed || !socket) return;
        socket.emit("send-message", { roomId, content: trimmed });
        setInput("");
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

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
                                     msg.sender?._id === currentUser?.id;
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
                        );
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
    );
}

// ── Room Page ─────────────────────────────────────────────────────────────────
export default function Room() {
    const { roomId }        = useParams();
    const navigate          = useNavigate();
    const { socket }        = useSocket();
    const { user }          = useContext(AuthContext);

    const [roomData, setRoomData]           = useState(null);
    const [participants, setParticipants]   = useState([]);
    const [language, setLanguage]           = useState("javascript");
    const [chatOpen, setChatOpen]           = useState(true);

    const editorRef      = useRef(null);
    const isRemoteUpdate = useRef(false);

    // Load room
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await api.get(`/rooms/${roomId}`);
                if (!cancelled) {
                    setRoomData(res.data.data);
                    setParticipants(res.data.data.participants ?? []);
                }
            } catch {
                if (!cancelled) navigate("/dashboard");
            }
        };
        load();
        return () => { cancelled = true; };
    }, [roomId, navigate]);

    // Join socket room
    useEffect(() => {
        if (!socket || !roomId || !roomData) return;
        socket.emit("join-room", roomId);
    }, [socket, roomId, roomData]);

    // Participant events
    useEffect(() => {
        if (!socket) return;
        const onJoined = ({ userId }) =>
            setParticipants(prev => prev.some(p => (p._id ?? p) === userId) ? prev : [...prev, { _id: userId }]);
        const onLeft = ({ userId }) =>
            setParticipants(prev => prev.filter(p => (p._id ?? p) !== userId));
        socket.on("user-joined", onJoined);
        socket.on("user-left", onLeft);
        return () => { socket.off("user-joined", onJoined); socket.off("user-left", onLeft); };
    }, [socket]);

    // Remote code sync
    useEffect(() => {
        if (!socket) return;
        const onCodeUpdate = (newCode) => {
            if (!shouldShareEditor(roomData) || !editorRef.current) return;
            isRemoteUpdate.current = true;
            const position  = editorRef.current.getPosition();
            const model     = editorRef.current.getModel();
            const fullRange = model?.getFullModelRange();
            if (fullRange) {
                editorRef.current.executeEdits("remote-sync", [{ range: fullRange, text: newCode ?? "" }]);
            } else {
                editorRef.current.setValue(newCode ?? "");
            }
            if (position) editorRef.current.setPosition(position);
            setTimeout(() => { isRemoteUpdate.current = false; }, 0);
        };
        socket.on("code-update", onCodeUpdate);
        return () => socket.off("code-update", onCodeUpdate);
    }, [socket, roomData]);

    // Remote language sync
    useEffect(() => {
        if (!socket) return;
        socket.on("language-update", setLanguage);
        return () => socket.off("language-update", setLanguage);
    }, [socket]);

    const handleEditorDidMount = useCallback((editor) => {
        editorRef.current = editor;
    }, []);

    const handleEditorChange = (value) => {
        if (isRemoteUpdate.current) return;
        if (!socket || !roomId || !shouldShareEditor(roomData)) return;
        socket.emit("code-change", { roomId, code: value ?? "" });
    };

    const handleLanguageChange = (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        if (socket && roomId) socket.emit("language-change", { roomId, language: lang });
    };

    if (!roomData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-300">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Loading space…</p>
                </div>
            </div>
        );
    }

    const sharing     = shouldShareEditor(roomData);
    const currentLang = LANGUAGES.find(l => l.value === language) ?? LANGUAGES[0];

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
                </div>
            </header>

            {/* Editor + Chat */}
            <div className="flex flex-1 min-h-0">

                {/* Editor */}
                <div className="flex flex-col flex-1 min-w-0 p-3 gap-2">
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
        </div>
    );
}