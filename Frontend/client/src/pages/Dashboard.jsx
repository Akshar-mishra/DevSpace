import { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

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

// ── Create Room Modal ─────────────────────────────────────────────────────────
const CreateRoomModal = ({ onClose, onCreated }) => {
    const [form, setForm]       = useState({ name: '', type: 'friendly_room', mode: 'collab', maxParticipants: 2 });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError('Room name is required'); return; }
        setError(''); setLoading(true);
        try {
            const res = await api.post('/rooms', {
                name: form.name.trim(),
                type: form.type,
                mode: form.type === 'interview_room' ? undefined : form.mode,
                maxParticipants: Number(form.maxParticipants)
            });
            onCreated(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal title="Create a Room" onClose={onClose}>
            <div className="space-y-4">
                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

                <Field label="Room Name">
                    <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Sunday DSA Grind" disabled={loading} />
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
                                <button key={m} type="button"
                                    onClick={() => set('mode', m)}
                                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                                        form.mode === m
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
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

                <button onClick={handleSubmit} disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold text-sm transition-colors mt-2">
                    {loading ? 'Creating…' : 'Create Room'}
                </button>
            </div>
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
const RoomCard = ({ room, onEnter, onCopyInvite }) => {
    const b = badge(room.type, room.mode);
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
    const [toast, setToast]         = useState('');

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
                                <RoomCard key={room._id} room={room}
                                    onEnter={handleEnter}
                                    onCopyInvite={handleCopyInvite} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;