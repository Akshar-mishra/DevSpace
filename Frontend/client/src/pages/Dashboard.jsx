import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { submitSessionFeedback } from '../services/session.service.js'
import { getMySessions } from '../services/session.service.js'

// ── tiny helpers ──────────────────────────────────────────────────────────────
const badge = (type) => {
    if (type === 'interview_room') return { label: 'INTERVIEW', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40' };
    else return { label: 'COLLAB', color: 'bg-teal-500/20 text-teal-300 border-teal-400/40' };
};

const statusDot = (status) => ({
    waiting: 'bg-yellow-400',
    active:  'bg-green-400',
    ended:   'bg-gray-500',
}[status] ?? 'bg-gray-500');

const statusLabel = (status) => ({
    waiting: 'text-yellow-400',
    active:  'text-green-400',
    ended:   'text-gray-500',
}[status] ?? 'text-gray-500');

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl shadow-2xl border border-white/10"
            style={{ background: 'rgba(15,17,32,0.98)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
                <h3 className="font-bold text-base text-white tracking-tight">{title}</h3>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 text-lg leading-none">✕</button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

// ── Field component ───────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-lg text-white text-sm focus:outline-none transition-colors disabled:opacity-50 border border-white/10 focus:border-indigo-500/60"
    + " bg-white/5";

// ── Create Room Wizard ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreated }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({ name: '', type: 'friendly_room', mode: 'collab', maxParticipants: 2 });

    const [roomData, setRoomData] = useState(null);
    const [problemInput, setProblemInput] = useState('');
    const [generating, setGenerating] = useState(false);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

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
            setStep(form.type === 'interview_room' ? 2 : 3);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateProblem = async () => {
        const trimmed = problemInput.trim();
        if (!trimmed) { setError('Type a topic first'); return; }
        setError(''); setGenerating(true);
        try {
            const res = await api.post(`/rooms/${roomData._id}/add-problem`, { problemName: trimmed });
            setRoomData(res.data.data);
            setProblemInput('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate problem');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal title={step === 1 ? "Create a Room" : step === 2 ? "Room Arsenal" : "Room Ready!"} onClose={onClose}>
            {step === 1 && (
                <div className="space-y-4">
                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                    <Field label="Room Name">
                        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g. Sunday DSA Grind" disabled={loading} autoFocus />
                    </Field>
                    <Field label="Room Type">
                        <select 
                            className={inputCls} 
                            value={form.type} 
                            onChange={e => set('type', e.target.value)} 
                            disabled={loading}
                        >
                            {/* Added background and text colors to the options */}
                            <option value="friendly_room" className="bg-gray-900 text-white">Friendly Room</option>
                            <option value="interview_room" className="bg-gray-900 text-white">Interview Room</option>
                        </select>
                    </Field>
                    <Field label="Max Participants">
                        <input 
                            className={inputCls} 
                            type="number" 
                            min={2} 
                            max={10}
                            // Force value to 2 if interview room, otherwise use state
                            value={form.type === 'interview_room' ? 2 : form.maxParticipants} 
                            onChange={e => set('maxParticipants', e.target.value)} 
                            // Lock the input if loading OR if it's an interview room
                            disabled={loading || form.type === 'interview_room'} 
                        />
                    </Field>
                    <button onClick={handleCreateRoom} disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors mt-1">
                        {loading ? 'Creating…' : 'Next →'}
                    </button>
                </div>
            )}

            {step === 2 && roomData && (
                <div className="space-y-4 relative">
                    <style>{`
                        @keyframes rocket-blast {
                            0% { transform: translateY(15px) scale(0.8); opacity: 0; }
                            30% { transform: translateY(0px) scale(1.2); opacity: 1; }
                            100% { transform: translateY(-40px) scale(0.5); opacity: 0; }
                        }
                        .animate-rocket { animation: rocket-blast 1.2s ease-in-out infinite; display: inline-block; }
                    `}</style>
                    <p className="text-sm text-gray-500">Pre-load algorithmic challenges before inviting the candidate.</p>
                    {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                    <div className="flex gap-2">
                        <input className={inputCls} value={problemInput} onChange={e => setProblemInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !generating && handleGenerateProblem()}
                            placeholder="e.g., Two Sum, DP Matrix..." disabled={generating} autoFocus />
                        <button onClick={handleGenerateProblem} disabled={generating || !problemInput.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 rounded-lg font-bold text-sm transition-all shrink-0 w-24 flex items-center justify-center border border-indigo-500/30">
                            {generating ? <span className="animate-rocket text-xl">🚀</span> : <span>✨ Add</span>}
                        </button>
                    </div>
                    <div className="bg-white/3 border border-white/8 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto relative">
                        {generating && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                                <p className="text-xs text-indigo-400 animate-pulse font-mono">Igniting AI Engines...</p>
                            </div>
                        )}
                        {roomData.problems?.length === 0 ? (
                            <div className="text-center text-gray-600 text-xs py-6">No problems added yet.</div>
                        ) : (
                            <ul className="space-y-2">
                                {roomData.problems.map((p, i) => (
                                    <li key={p._id || i} className="text-sm text-gray-300 bg-white/5 px-3 py-2 rounded border border-white/8 flex items-center gap-2">
                                        <span className="text-indigo-400 font-mono text-xs">Q{i + 1}</span> {p.title}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setStep(3)} disabled={generating}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors">
                        Finish Setup →
                    </button>
                </div>
            )}

            {step === 3 && roomData && (
                <div className="space-y-6 text-center py-4">
                    <div className="w-14 h-14 bg-green-500/15 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/25">
                        <span className="text-2xl">✓</span>
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-white mb-1">Room Created</h4>
                        <p className="text-sm text-gray-500">Share this link with your candidate.</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-1 flex items-center">
                        <input readOnly value={roomData.inviteLink} className="bg-transparent text-gray-300 text-sm px-3 py-2 w-full outline-none font-mono text-center" />
                    </div>
                    <button onClick={() => onCreated(roomData)}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded-lg font-bold text-sm transition-colors">
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
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                <Field label="Invite Code">
                    <input className={inputCls} value={inviteLink} onChange={e => setInviteLink(e.target.value)}
                        placeholder="e.g. a1b2c3d4" disabled={loading} autoFocus />
                </Field>
                <button onClick={handleJoin} disabled={loading}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors">
                    {loading ? 'Joining…' : 'Join Room'}
                </button>
            </div>
        </Modal>
    );
};

// ── Room Card ─────────────────────────────────────────────────────────────────
const RoomCard = ({ room, onEnter, onCopyInvite, onDelete, currentUser }) => {
    const b = badge(room.type, room.mode);
    const isCreator = currentUser?._id === (room.createdBy?._id || room.createdBy);

    return (
        <div className="rounded-2xl border border-white/10 p-5 flex flex-col gap-4 transition-all duration-200 hover:border-white/20 group"
            style={{ background: 'rgba(255,255,255,0.04)' }}>

            {/* Top row: name + badge */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="font-bold text-white text-base truncate group-hover:text-indigo-300 transition-colors">{room.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Host: <span className="text-gray-400">{room.createdBy?.name ?? 'Unknown'}</span></p>
                </div>
                <span className={`shrink-0 text-[10px] px-2.5 py-0.5 rounded-full border font-bold tracking-wider ${b.color}`}>{b.label}</span>
            </div>

            {/* Status + users */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusDot(room.status)}`} />
                    <span className={`text-xs font-medium capitalize ${statusLabel(room.status)}`}>{room.status}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{room.participants?.length ?? 0} / {room.maxParticipants} Users</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-1 border-t border-white/6">
                <button onClick={() => onEnter(room._id)}
                    disabled={room.status === 'ended'}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-colors">
                    {room.status === 'ended' ? 'Ended' : 'Enter'}
                </button>
                <button onClick={() => onCopyInvite(room.inviteLink)}
                    title="Copy invite link"
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-colors">
                    🔗
                </button>
                {isCreator && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(room._id); }}
                        title="Delete Room"
                        className="px-3 py-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl text-sm transition-colors">
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
    const [modal, setModal]         = useState(null);
    const [toast, setToast]         = useState('');
    const [pastSessions, setPastSessions] = useState([]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2500);
    };

    const fetchRooms = useCallback(async () => {
        try {
            const res = await api.get('/rooms/my-rooms');
            setRooms(res.data.data);
        } catch {
            // fail silently
        } finally {
            setRoomsLoading(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleCreated = (room) => {
        setModal(null);
        setRooms(prev => [room, ...prev]);
        navigate(`/room/${room._id}`);
    };

    const handleJoined = (roomId) => {
        setModal(null);
        fetchRooms();
        navigate(`/room/${roomId}`);
    };

    const handleEnter    = (roomId) => navigate(`/room/${roomId}`);

    const handleCopyInvite = (inviteLink) => {
        navigator.clipboard.writeText(inviteLink)
            .then(() => showToast('Invite code copied!'))
            .catch(() => showToast('Copy failed — code: ' + inviteLink));
    };

    const handleDeleteRoom = async (roomId) => {
        if (window.confirm("Are you sure you want to permanently delete this room? All code and sessions will be destroyed.")) {
            try {
                await api.delete(`/rooms/${roomId}`);
                setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
            } catch (error) {
                console.error("Failed to delete room:", error);
                alert("Error deleting room. Check console.");
            }
        }
    };

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
        <div className="min-h-screen text-white" style={{ background: '#0b0d1a' }}>

            {/* subtle grid bg */}
            <div className="fixed inset-0 pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                backgroundSize: '48px 48px'
            }} />

            {/* ── Toast ── */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 text-sm text-white px-4 py-2.5 rounded-xl shadow-xl border border-white/15"
                    style={{ background: 'rgba(20,22,40,0.95)' }}>
                    {toast}
                </div>
            )}

            {/* ── Modals ── */}
            {modal === 'create' && <CreateRoomModal onClose={() => setModal(null)} onCreated={handleCreated} />}
            {modal === 'join'   && <JoinRoomModal   onClose={() => setModal(null)} onJoined={handleJoined} />}

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-white/8 px-6 py-4"
                style={{ background: 'rgba(11,13,26,0.85)', backdropFilter: 'blur(16px)' }}>
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black tracking-tight" style={{ color: '#818cf8' }}>DevSpace</h1>
                        <p className="text-xs text-gray-600 mt-0.5">Welcome back, {user?.name?.toLowerCase()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest text-gray-400 border border-white/10"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {user?.role?.toUpperCase()}
                        </span>
                        <button onClick={handleLogout}
                            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors border border-pink/10 text-red-400 bg-white/[0.04] hover:text-white hover:border-white/20 hover:bg-white/10"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <main className="max-w-6xl mx-auto px-6 py-8 relative">

                {/* ── Hero Banner ── */}
                <div className="rounded-2xl p-8 mb-8 flex items-center justify-between gap-6 border border-white/10 overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(17,24,39,0.6) 60%)' }}>
                    {/* decorative blob */}
                    <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10 pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
                    <div>
                        <h2 className="text-2xl font-black text-white mb-1">Launch a Workspace</h2>
                        <p className="text-sm text-gray-400 max-w-sm">Create a new real-time collaborative editor or join an existing session to start coding instantly.</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button onClick={() => setModal('create')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
                            <span>＋</span> Create
                        </button>
                        <button onClick={() => setModal('join')}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm border border-white/15 transition-colors hover:border-white/30 text-gray-300 hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <span>🔗</span> Join
                        </button>
                    </div>
                </div>

                {/* ── Two-column layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── LEFT: Active Workspaces ── */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Workspaces</h2>
                            {!roomsLoading && rooms.length > 0 && (
                                <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-indigo-300 border border-indigo-500/30"
                                    style={{ background: 'rgba(99,102,241,0.15)' }}>
                                    {rooms.length}
                                </span>
                            )}
                        </div>

                        {roomsLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="rounded-2xl border border-white/8 h-44 animate-pulse"
                                        style={{ background: 'rgba(255,255,255,0.03)' }} />
                                ))}
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10">
                                <p className="text-3xl mb-3">🚀</p>
                                <p className="text-gray-400 font-semibold text-sm">No active workspaces</p>
                                <p className="text-gray-600 text-xs mt-1">Create one or join with an invite code</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>

                    {/* ── RIGHT: Session History ── */}
                    <div className="space-y-4">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Session History</h2>

                        <div className="rounded-2xl border border-white/10 overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.03)' }}>
                            {pastSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                    <p className="text-2xl mb-2">📋</p>
                                    <p className="text-gray-500 text-xs">No past sessions recorded yet.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/6 max-h-[480px] overflow-y-auto">
                                    {pastSessions.map((session) => (
                                        <div
                                            key={session._id}
                                            onClick={() => navigate(`/session/${session._id}`)}
                                            className="px-4 py-3.5 hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                                                {session.room?.name || "Untitled Session"}
                                            </h3>
                                            <p className="text-xs text-gray-600 mt-0.5 mb-2">
                                                {new Date(session.endedAt).toLocaleDateString()}
                                            </p>
                                            {session.feedback ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] uppercase font-bold text-indigo-500 tracking-wider">Overall</span>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <div key={star} className={`w-1.5 h-1.5 rounded-full ${star <= session.feedback.overall ? 'bg-yellow-400' : 'bg-white/10'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-gray-600 italic">No feedback yet</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Dashboard;