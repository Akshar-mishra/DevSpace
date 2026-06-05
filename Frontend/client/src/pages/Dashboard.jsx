import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { getMySessions,deleteSession } from '../services/session.service.js'

const badge = (type) => {
    if (type === 'interview_room') return { label: 'INTERVIEW', color: 'bg-[#1f6feb]/10 text-[#58a6ff] border-[#1f6feb]/30' };
    else return { label: 'COLLAB', color: 'bg-[#238636]/10 text-[#3fb950] border-[#238636]/30' };
};

const statusDot = (status) => ({
    waiting: 'bg-[#d29922]',
    active:  'bg-[#3fb950]',
    ended:   'bg-[#8b949e]',
}[status] ?? 'bg-[#8b949e]');

const statusLabel = (status) => ({
    waiting: 'text-[#d29922]',
    active:  'text-[#3fb950]',
    ended:   'text-[#8b949e]',
}[status] ?? 'text-[#8b949e]');

// Modal wrapper
const Modal = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#010409]/80 backdrop-blur-sm p-4 transition-all">
        <div className="w-full max-w-md rounded-xl shadow-2xl border border-[#30363d] relative overflow-hidden bg-[#161b22]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#30363d]">
                <h3 className="font-semibold text-base text-[#c9d1d9]">{title}</h3>
                <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#30363d] text-xl leading-none">✕</button>
            </div>
            <div className="px-5 py-5">{children}</div>
        </div>
    </div>
);

// Field component 
const Field = ({ label, children }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#8b949e]">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 rounded-md text-[#c9d1d9] text-sm focus:outline-none transition-all disabled:opacity-50 border border-[#30363d] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] bg-[#0d1117] placeholder:text-[#8b949e]";

// Create Room Modal 
const CreateRoomModal = ({ onClose, onCreated,user  }) => {
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
            //Collab mode skips AI generation during creation
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
        <Modal title={step === 1 ? "Create Workspace" : step === 2 ? "Add Problems" : "Workspace Ready"} onClose={onClose}>
            {step === 1 && (
                <div className="space-y-4">
                    {error && <p className="text-sm text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{error}</p>}
                    <Field label="Workspace Name">
                        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
                            placeholder="e.g.Mock interview" disabled={loading} autoFocus />
                    </Field>
                    <Field label="Room Type">
                        <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)} disabled={loading}>
                            <option value="friendly_room" className="bg-[#0d1117]">Collaboration Mode</option>
                            {user?.role === 'interviewer' && (
                                <option value="interview_room" className="bg-[#0d1117]">Interview Mode</option>
                            )}
                        </select>
                    </Field>
                    <Field label="Max Participants">
                        <input className={inputCls} type="number" min={2} max={10}
                            value={form.type === 'interview_room' ? 2 : form.maxParticipants} 
                            onChange={e => set('maxParticipants', e.target.value)} 
                            disabled={loading || form.type === 'interview_room'} />
                    </Field>
                    <button onClick={handleCreateRoom} disabled={loading}
                        className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white disabled:opacity-50 rounded-md font-medium text-sm transition-colors mt-2">
                        {loading ? 'Creating...' : 'Next Step'}
                    </button>
                </div>
            )}

            {step === 2 && roomData && (
                <div className="space-y-4">
                    <p className="text-sm text-[#8b949e]">Pre-load algorithmic challenges before inviting participants.</p>
                    {error && <p className="text-sm text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{error}</p>}
                    <div className="flex gap-2">
                        <input className={inputCls} value={problemInput} onChange={e => setProblemInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !generating && handleGenerateProblem()}
                            placeholder="e.g., Two Sum..." disabled={generating} autoFocus />
                        <button onClick={handleGenerateProblem} disabled={generating || !problemInput.trim()}
                            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] disabled:opacity-50 rounded-md font-medium text-sm transition-colors shrink-0 w-24 flex items-center justify-center text-[#c9d1d9]">
                            {generating ? <span className="animate-pulse">...</span> : <span>Add</span>}
                        </button>
                    </div>
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-3 min-h-[120px] max-h-[200px] overflow-y-auto relative custom-scrollbar">
                        {generating && (
                            <div className="absolute inset-0 bg-[#0d1117]/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                                <p className="text-sm text-[#58a6ff] animate-pulse font-medium">Generating...</p>
                            </div>
                        )}
                        {roomData.problems?.length === 0 ? (
                            <div className="text-center text-[#8b949e] text-xs py-8">No problems added yet.</div>
                        ) : (
                            <ul className="space-y-2">
                                {roomData.problems.map((p, i) => (
                                    <li key={p._id || i} className="text-sm text-[#c9d1d9] bg-[#161b22] px-3 py-2 rounded-md border border-[#30363d] flex items-center gap-3">
                                        <span className="text-[#58a6ff] font-mono text-[10px]">Q{i + 1}</span> {p.title}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <button onClick={() => setStep(3)} disabled={generating}
                        className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white rounded-md font-medium text-sm transition-colors mt-2">
                        Finish Setup
                    </button>
                </div>
            )}

            {step === 3 && roomData && (
                <div className="space-y-5 text-center py-4">
                    <div className="w-12 h-12 bg-[#238636]/10 text-[#3fb950] rounded-full flex items-center justify-center mx-auto border border-[#238636]/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <div>
                        <h4 className="text-base font-semibold text-white mb-1">Workspace Ready</h4>
                        <p className="text-sm text-[#8b949e]">Share this link to invite participants.</p>
                    </div>
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-1.5 flex items-center">
                        <input readOnly value={roomData.inviteLink} className="bg-transparent text-[#c9d1d9] text-sm px-2 py-1 w-full outline-none font-mono text-center" />
                    </div>
                    <button onClick={() => onCreated(roomData)}
                        className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] rounded-md font-medium text-sm transition-colors text-white">
                        Enter Workspace Now
                    </button>
                </div>
            )}
        </Modal>
    );
};

// Join Room Modal 
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
        <Modal title="Join Workspace" onClose={onClose}>
            <div className="space-y-4">
                {error && <p className="text-sm text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/30 rounded-md px-3 py-2">{error}</p>}
                <Field label="Invite Code">
                    <input className={inputCls} value={inviteLink} onChange={e => setInviteLink(e.target.value)}
                        placeholder="e.g. a1b2c3d4" disabled={loading} autoFocus />
                </Field>
                <button onClick={handleJoin} disabled={loading}
                    className="w-full py-2 bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white disabled:opacity-50 rounded-md font-medium text-sm transition-colors mt-2">
                    {loading ? 'Joining...' : 'Connect'}
                </button>
            </div>
        </Modal>
    );
};

// Room Card 
const RoomCard = ({ room, onEnter, onCopyInvite, onDelete, currentUser }) => {
    const b = badge(room.type);
    const isCreator = currentUser?._id === (room.createdBy?._id || room.createdBy);

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-[#30363d] bg-[#02060b] p-5 transition-colors hover:border-[#8b949e]">
            
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-semibold text-white text-base truncate">{room.name}</h3>
                    <p className="text-xs text-[#8b949e] mt-1">Host: {room.createdBy?.name ?? 'Unknown'}</p>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded border font-semibold tracking-wide ${b.color}`}>{b.label}</span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 bg-[#0d1117] px-2.5 py-1.5 rounded-md border border-[#30363d]">
                    <span className={`w-2 h-2 rounded-full ${statusDot(room.status)}`} />
                    <span className={`text-[11px] font-medium capitalize ${statusLabel(room.status)}`}>{room.status}</span>
                </div>
                <div className="text-xs text-[#8b949e]">
                    {room.participants?.length ?? 0}/{room.maxParticipants}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2">
                <button onClick={() => onEnter(room._id)}
                    disabled={room.status === 'ended'}
                    className="flex-1 py-1.5 bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors">
                    {room.status === 'ended' ? 'Ended' : 'Enter'}
                </button>
                <button onClick={() => onCopyInvite(room.inviteLink)}
                    title="Copy invite link"
                    className="px-3 flex items-center justify-center bg-[#21262d] hover:bg-[#30363d] border border-[#363b42] rounded-md text-sm transition-colors text-[#c9d1d9]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                </button>
                {isCreator && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(room._id); }}
                        title="Delete Room"
                        className="px-3 flex items-center justify-center bg-transparent hover:bg-[#da3633]/10 border border-transparent hover:border-[#f85149]/30 text-[#f85149] rounded-md transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                )}
            </div>
        </div>
    );
};

// Dashboard page
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
            .then(() => showToast('Invite link copied!'))
            .catch(() => showToast('Copy failed — code: ' + inviteLink));
    };

    const handleDeleteRoom = async (roomId) => {
        if (window.confirm("Are you sure you want to permanently delete this room? All code and sessions will be destroyed.")) {
            try {
                await api.delete(`/rooms/${roomId}`);
                setRooms(prevRooms => prevRooms.filter(room => room._id !== roomId));
            } catch (error) {
                console.error("Failed to delete room:", error);
                alert("Error deleting room.");
            }
        }
    };

    const handleDeleteSession = async (e, sessionId) => {
        e.stopPropagation(); // Prevents the card click from routing you to the session page
        if (window.confirm("Delete this session from your history?")) {
            try {
                await deleteSession(sessionId);
                setPastSessions(prev => prev.filter(s => s._id !== sessionId));
                showToast('Session history deleted!');
            } catch (error) {
                console.error("Failed to delete session:", error);
                alert("Error deleting session.");
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
        <div className="min-h-screen text-[#c9d1d9] bg-[#0d1117] font-sans">
            
            {/* ── Toast ── */}
            {toast && (
                <div className="fixed top-6 right-6 z-50 text-sm text-white px-5 py-3 rounded-md shadow-lg border border-[#30363d] bg-[#161b22] flex items-center gap-2">
                    <span className="text-[#3fb950]">✓</span> {toast}
                </div>
            )}

            {/* ── Modals ── */}
            {modal === 'create' && <CreateRoomModal onClose={() => setModal(null)} onCreated={handleCreated} user={user}  />}
            {modal === 'join'   && <JoinRoomModal   onClose={() => setModal(null)} onJoined={handleJoined} />}

            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#161b22] px-6 md:px-10 py-4">
    <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0d1117] border border-[#30363d] flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#c9d1d9]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                        </div>
                        <h1 className="text-xl font-semibold text-white tracking-tight">DevSpace</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-semibold text-white">{user?.name}</span>
                            <span className="text-[10px] text-[#8b949e]">{user?.role === 'interviewer' ? 'Interviewer' : 'Candidate'}</span>
                        </div>
                        <div className="h-6 w-px bg-[#30363d] hidden sm:block" />
                        <button onClick={handleLogout} className="text-sm font-medium transition-colors text-[#ffffff] hover:text-[#d40b0b]  hover:border-[#f85149]/30 border rounded-md px-3 py-1">
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Body ── */}
            <main className="w-screen mx-auto w-full px-6 md:px-10 py-8 lg:py-10">

                {/* ── Hero Banner ── */}
                <div className="w-full rounded-xl p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#30363d] bg-[#000204]">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-semibold text-white mb-2">Workspaces</h2>
                        <p className="text-sm text-[#8b949e]">
                            Create a new collaborative editor or join an existing session to start coding instantly.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        <button onClick={() => setModal('join')}
                            className="px-5 py-2 rounded-md font-medium text-sm transition-colors border border-[#bfc5ce] bg-[#21262d] hover:bg-[#30363d] text-[#fdfeff]">
                            Join Workspace
                        </button>
                        <button onClick={() => setModal('create')}
                            className="px-5 py-2 rounded-md font-medium text-sm transition-colors border border-[rgba(240,246,252,0.1)] bg-[#238636] hover:bg-[#27ad3f] text-[#fdfeff]">
                            New Workspace
                        </button>
                    </div>
                </div>

                {/* ── Grid Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 lg:gap-8">

                    {/* ── LEFT: Active Workspaces ── */}
                    <div className="lg:col-span-3 xl:col-span-4 space-y-4">
                        <div className="flex items-center gap-3 border-b border-[#b6c1ce] pb-3">
                            <h2 className="text-sm font-semibold text-white">Active</h2>
                            {!roomsLoading && rooms.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium text-[#c9d1d9] bg-[#454648]">
                                    {rooms.length}
                                </span>
                            )}
                        </div>

                        {roomsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl border border-[#166fd5] bg-[#161b22] h-40 animate-pulse" />
                                ))}
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-[#30363d] bg-[#0d1117]">
                                <p className="text-[#8b949e] font-medium text-sm">No active workspaces</p>
                                <p className="text-[#8b949e] text-xs mt-1">Create one or join with an invite code.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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

                    {/* ── RIGHT: Session History Sidebar ── */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="border-b border-[#b6c1ce] pb-3">
                            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
                        </div>

                        <div className="rounded-xl border border-[#30363d] bg-[#010305] overflow-hidden">
                            {pastSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <p className="text-[#8b949e] text-sm">No past sessions recorded.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#30363d] max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {pastSessions.map((session) => (
                                        <div
                                            key={session._id}
                                            onClick={() => navigate(`/session/${session._id}`)}
                                            className="p-4 hover:bg-[#30363d]/50 transition-colors cursor-pointer relative group"
                                        >
                                            {/* Hover Delete Button */}
                                            <button
                                                onClick={(e) => handleDeleteSession(e, session._id)}
                                                className="absolute top-4 right-4 text-[#8b949e] hover:text-[#f85149] opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Session History"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>

                                            <h3 className="text-sm font-medium text-[#58a6ff] hover:underline truncate mb-1 pr-6">
                                                {session.room?.name || "Untitled Session"}
                                            </h3>
                                            <p className="text-xs text-[#8b949e] mb-3">
                                                {new Date(session.endedAt).toLocaleDateString()}
                                            </p>
                                            
                                            {session.feedback ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-[#8b949e]">Score:</span>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <div key={star} className={`w-1.5 h-1.5 rounded-full ${star <= session.feedback.overall ? 'bg-[#3fb950]' : 'bg-[#30363d]'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-[#8b949e]">No feedback</div>
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