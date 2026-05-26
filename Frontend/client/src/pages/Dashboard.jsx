import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { submitSessionFeedback } from '../services/session.service.js'
import { getMySessions } from '../services/session.service.js'

// ── tiny helpers ──────────────────────────────────────────────────────────────
const badge = (type, mode) => {
    if (type === 'interview_room') return { label: 'Interview', color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' };
    if (mode === 'collab')         return { label: 'Collab',    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    return                                { label: 'Compete',   color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
};

const statusDot = (status) => ({
    waiting: 'bg-yellow-400',
    active:  'bg-green-400',
    ended:   'bg-gray-500',
}[status] ?? 'bg-gray-500');

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                <h3 className="font-bold text-lg text-white">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

// ── Field component ───────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div className="space-y-1">
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50";

// ── Create Room Wizard ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreated }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Step 1 State
    const [form, setForm] = useState({ name: '', type: 'friendly_room', mode: 'collab', maxParticipants: 2 });
    
    // Step 2 & 3 State
    const [roomData, setRoomData] = useState(null);
    const [problemInput, setProblemInput] = useState('');
    const [generating, setGenerating] = useState(false);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    // STEP 1: Create the empty room in the database
    const handleCreateRoom = async () => {
        if (!form.name.trim()) { setError('Room name is required'); return; }
        setError(''); setLoading(true);
        try {
            const res = await api.post('/rooms', {
                name: form.name.trim(),
                type: form.type,
                mode: form.type === 'interview_room' ? undefined : form.mode,
                maxParticipants: Number(form.maxParticipants)
            });
            setRoomData(res.data.data);
            setStep(form.type === 'interview_room' ? 2 : 3); // Friendly rooms skip the problem generator
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: Generate problems via AI
    const handleGenerateProblem = async () => {
        const trimmed = problemInput.trim();
        if (!trimmed) { setError('Type a topic first'); return; }
        
        setError(''); setGenerating(true);
        try {
            const res = await api.post(`/rooms/${roomData._id}/add-problem`, { problemName: trimmed });
            setRoomData(res.data.data); // Updates roomData with the new problem array
            setProblemInput('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate problem');
        } finally {
            setGenerating(false);
        }
    };

    
    return (
        <Modal title={step === 1 ? "Create a Room" : step === 2 ? "Room Arsenal" : "Room Ready!"} onClose={onClose}>
            {/* ── STEP 1: Details ── */}
            {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

                    <Field label="Room Name">
                        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g. Sunday DSA Grind" disabled={loading} autoFocus />
                    </Field>

                    <Field label="Room Type">
                        <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)} disabled={loading}>
                            <option value="friendly_room">Friendly Room</option>
                            <option value="interview_room">Interview Room</option>
                        </select>
                    </Field>

                    {form.type === 'friendly_room' && (
                        <Field label="Mode">
                            <div className="grid grid-cols-2 gap-2">
                                {['collab', 'compete'].map(m => (
                                    <button key={m} type="button" onClick={() => set('mode', m)}
                                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                                            form.mode === m ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}>
                                        {m === 'collab' ? '🤝 Collab' : '⚔️ Compete'}
                                    </button>
                                ))}
                            </div>
                        </Field>
                    )}

                    <Field label="Max Participants">
                        <input className={inputCls} type="number" min={2} max={10}
                            value={form.maxParticipants} onChange={e => set('maxParticipants', e.target.value)} disabled={loading} />
                    </Field>

                    <button onClick={handleCreateRoom} disabled={loading}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors mt-2">
                        {loading ? 'Creating…' : 'Next Step ➔'}
                    </button>
                </div>
            )}

            {/* ── STEP 2: The Arsenal (Interviews Only) ── */}
            {step === 2 && roomData && (
                <div className="space-y-4 animate-fade-in relative">
                    {/* Inline animation so you don't need to touch index.css */}
                    <style>{`
                        @keyframes rocket-blast {
                            0% { transform: translateY(15px) scale(0.8); opacity: 0; }
                            30% { transform: translateY(0px) scale(1.2); opacity: 1; }
                            100% { transform: translateY(-40px) scale(0.5); opacity: 0; }
                        }
                        .animate-rocket {
                            animation: rocket-blast 1.2s ease-in-out infinite;
                            display: inline-block;
                        }
                    `}</style>

                    <p className="text-sm text-gray-400">Pre-load algorithmic challenges before inviting the candidate.</p>
                    
                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

                    <div className="flex gap-2">
                        <input 
                            className={inputCls} 
                            value={problemInput} 
                            onChange={e => setProblemInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !generating && handleGenerateProblem()}
                            placeholder="e.g., Two Sum, DP Matrix..." 
                            disabled={generating} 
                            autoFocus 
                        />
                        {/* Upgraded Button with Rocket Animation */}
                        <button onClick={handleGenerateProblem} disabled={generating || !problemInput.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 rounded-lg font-bold text-sm transition-all shrink-0 w-28 flex items-center justify-center overflow-hidden border border-purple-500/30">
                            {generating ? (
                                <span className="flex items-center gap-1.5 text-purple-200">
                                    <span className="animate-rocket text-xl">🚀</span>
                                </span>
                            ) : (
                                <span>✨ Add</span>
                            )}
                        </button>
                    </div>

                    {/* Problem List */}
                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto custom-scrollbar relative">
                        {generating && (
                            <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                <p className="text-xs text-purple-400 animate-pulse font-mono">Igniting AI Engines...</p>
                            </div>
                        )}
                        {roomData.problems?.length === 0 ? (
                            <div className="text-center text-gray-600 text-xs py-6">No problems added yet.</div>
                        ) : (
                            <ul className="space-y-2">
                                {roomData.problems.map((p, i) => (
                                    <li key={p._id || i} className="text-sm text-gray-300 bg-gray-900 px-3 py-2 rounded border border-gray-700 flex items-center gap-2">
                                        <span className="text-purple-400 font-mono text-xs">Q{i + 1}</span> {p.title}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button onClick={() => setStep(3)} disabled={generating}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-sm transition-colors mt-2">
                        Finish Setup ➔
                    </button>
                </div>
            )}

            {/* ── STEP 3: The Reveal ── */}
            {step === 3 && roomData && (
                <div className="space-y-6 animate-fade-in text-center py-4">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/30">
                        <span className="text-3xl">✓</span>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white mb-1">Room Created Successfully</h4>
                        <p className="text-sm text-gray-400">Share this link with your candidate to begin.</p>
                    </div>

                    <div className="bg-gray-950 border border-gray-800 rounded-lg p-1 flex items-center">
                        <input readOnly value={roomData.inviteLink} className="bg-transparent text-gray-300 text-sm px-3 py-2 w-full outline-none font-mono text-center" />
                    </div>

                    <button onClick={() => onCreated(roomData)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-sm shadow-lg shadow-emerald-900/50 transition-all">
                        Enter Room Now
                    </button>
                </div>
            )}
        </Modal>
    );
};

// ── Join Room Modal ───────────────────────────────────────────────────────────
const JoinRoomModal = ({ onClose, onJoined }) => {
    const [inviteLink, setInviteLink] = useState('');
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState('');

    const handleJoin = async () => {
        const code = inviteLink.trim();
        if (!code) { setError('Paste an invite code'); return; }
        setError(''); setLoading(true);
        try {
            // ✅ FIX 3: navigate using _id returned from joinRoom
            const res = await api.post(`/rooms/join/${code}`);
            onJoined(res.data.data._id);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Join a Room" onClose={onClose}>
            <div className="space-y-4">
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}
                <Field label="Invite Code">
                    <input className={inputCls} value={inviteLink} onChange={e => setInviteLink(e.target.value)}
                        placeholder="e.g. a1b2c3d4" disabled={loading} />
                </Field>
                <button onClick={handleJoin} disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors">
                    {loading ? 'Joining…' : 'Join Room'}
                </button>
            </div>
        </Modal>
    );
};

// ── Room Card ─────────────────────────────────────────────────────────────────
const RoomCard = ({ room, onEnter, onCopyInvite, onDelete, currentUser }) => {
    const b = badge(room.type, room.mode);
    
    // Check if the current user created this room
    const isCreator = currentUser?._id === (room.createdBy?._id || room.createdBy);

return (
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">{room.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        by {room.createdBy?.name ?? 'Unknown'} · {room.participants?.length ?? 0}/{room.maxParticipants} members
                    </p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${b.color}`}>{b.label}</span>
            </div>

            <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot(room.status)}`} />
                <span className="text-xs text-gray-500 capitalize">{room.status}</span>
            </div>

            <div className="flex gap-2 mt-auto">
                <button onClick={() => onEnter(room._id)}
                    disabled={room.status === 'ended'}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors">
                    {room.status === 'ended' ? 'Ended' : 'Enter Room'}
                </button>
                <button onClick={() => onCopyInvite(room.inviteLink)}
                    title="Copy invite code"
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition-colors">
                    📋
                </button>
                
                {/* ✨ THE NUKE BUTTON (Only visible to the creator) */}
                {isCreator && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Prevents accidental navigation
                            onDelete(room._id);
                        }}
                        title="Delete Room Permanently"
                        className="px-3 py-1.5 bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/30 rounded-lg text-xs transition-colors"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user, logout }          = useContext(AuthContext);
    const navigate                  = useNavigate();
    const [rooms, setRooms]         = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [modal, setModal]         = useState(null); // 'create' | 'join' | null
    const [toast, setToast]         = useState('')

    const [pastSessions, setPastSessions] = useState([])

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2500);
    };

    // ✅ FIX 6: Fetch user's rooms
    const fetchRooms = useCallback(async () => {
        try {
            const res = await api.get('/rooms/my-rooms');
            setRooms(res.data.data);
        } catch {
            // fail silently — rooms just show empty
        } finally {
            setRoomsLoading(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ✅ FIX 2 + 3: Always navigate using MongoDB _id
    const handleCreated = (room) => {
        setModal(null);
        setRooms(prev => [room, ...prev]);
        navigate(`/room/${room._id}`);
    };

    const handleJoined = (roomId) => {
        setModal(null);
        fetchRooms(); // refresh list
        navigate(`/room/${roomId}`);
    };

    const handleEnter = (roomId) => navigate(`/room/${roomId}`);

    const handleCopyInvite = (inviteLink) => {
        navigator.clipboard.writeText(inviteLink)
            .then(() => showToast('Invite code copied!'))
            .catch(() => showToast('Copy failed — code: ' + inviteLink));
    };

    const handleDeleteRoom = async (roomId) => {
        // Double-check before wiping the database
        if (window.confirm("Are you sure you want to permanently delete this room? All code and sessions will be destroyed.")) {
            try {
                // Hit the backend
                await api.delete(`/rooms/${roomId}`);
                
                // Instantly remove it from the screen
                setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
            } catch (error) {
                console.error("Failed to delete room:", error);
                alert("Error deleting room. Check console.");
            }
        }
    }

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await getMySessions();
                setPastSessions(res.data);
            } catch (err) {
                console.error("Failed to load history:", err);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* ── Toast ── */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 text-sm text-white px-4 py-2.5 rounded-xl shadow-xl animate-fade-in">
                    {toast}
                </div>
            )}

            {/* ── Modals ── */}
            {modal === 'create' && <CreateRoomModal onClose={() => setModal(null)} onCreated={handleCreated} />}
            {modal === 'join'   && <JoinRoomModal   onClose={() => setModal(null)} onJoined={handleJoined} />}

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-400 tracking-tight">DevSpace</h1>
                        <p className="text-xs text-gray-500">Welcome back, {user?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:block px-3 py-1 bg-gray-800 text-xs rounded-full border border-gray-700 text-gray-400">
                            {user?.role}
                        </span>
                        <button onClick={handleLogout}
                            className="px-4 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-sm rounded-lg font-medium transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button onClick={() => setModal('create')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20">
                        <span className="text-base">＋</span> Create Room
                    </button>
                    <button onClick={() => setModal('join')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold text-sm transition-colors">
                        <span className="text-base">🔗</span> Join Room
                    </button>
                </div>

                <div className="mt-10">
                    <h2 className="text-xl font-bold text-white mb-6">Past Sessions</h2>
                    
                    {pastSessions.length === 0 ? (
                        <div className="text-gray-500 italic">No past sessions found.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pastSessions.map((session) => (
                                <div 
                                    key={session._id} 
                                    onClick={() => navigate(`/session/${session._id}`)}
                                    className="bg-gray-900 border border-gray-800 p-5 rounded-xl hover:border-purple-500 transition-all cursor-pointer group"
                                >
                                    <h3 className="font-bold text-white mb-1 group-hover:text-purple-400">
                                        {session.room?.name || "Untitled Session"}
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-4">
                                        {new Date(session.endedAt).toLocaleDateString()}
                                    </p>
                                    
                                    {/* Embedded Feedback Summary */}
                                    {session.feedback ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-purple-500">Overall:</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <div key={star} className={`w-2 h-2 rounded-full ${star <= session.feedback.overall ? 'bg-yellow-500' : 'bg-gray-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-600 italic">No feedback submitted</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rooms section */}
                <section>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">My Rooms</h2>

                    {roomsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="bg-gray-800/40 border border-gray-700/40 rounded-xl p-4 h-36 animate-pulse" />
                            ))}
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-2xl">
                            <p className="text-4xl mb-3">🚀</p>
                            <p className="text-gray-400 font-medium">No rooms yet</p>
                            <p className="text-gray-600 text-sm mt-1">Create one or join with an invite code</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {rooms.map(room => (
                                <RoomCard 
                                    key={room._id} 
                                    room={room}
                                    onEnter={handleEnter}
                                    onCopyInvite={handleCopyInvite} 
                                    onDelete={handleDeleteRoom} 
                                    currentUser={user}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;