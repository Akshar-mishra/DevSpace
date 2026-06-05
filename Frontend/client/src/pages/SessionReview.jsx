import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../services/api";

export default function SessionReview() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSnapshotIdx, setActiveSnapshotIdx] = useState(0);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await api.get(`/sessions/${sessionId}`);
                setSession(res.data.data);
            } catch (err) {
                alert("Unauthorized or session not found");
                navigate("/dashboard");
            } finally {
                setLoading(false);
            }
        };
        fetchSession();
    }, [sessionId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 p-6 animate-pulse">
                <div className="w-32 h-6 bg-gray-800 rounded mb-6"></div> 
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[500px] bg-gray-900 rounded-xl"></div>
                    <div className="space-y-4">
                        <div className="h-40 bg-gray-900 rounded-xl"></div>
                        <div className="h-40 bg-gray-900 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 p-6 text-gray-200">
            <button onClick={() => navigate("/dashboard")} className="mb-6 text-purple-400 hover:text-purple-300 font-bold">← Back to Dashboard</button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Editor */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                        
                        {/* --- FIX: Added Header & Dropdown UI --- */}
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-lg font-bold text-white">{session.room?.name}</h2>
                            
                            {session.codeSnapshots && session.codeSnapshots.length > 0 && (
                                <select 
                                    className="bg-gray-800 text-sm font-semibold text-gray-200 px-3 py-1.5 rounded border border-gray-700 outline-none focus:border-purple-500"
                                    value={activeSnapshotIdx}
                                    onChange={(e) => setActiveSnapshotIdx(Number(e.target.value))}
                                >
                                    {session.codeSnapshots.map((snap, idx) => (
                                        <option key={idx} value={idx}>
                                            File {idx + 1} ({snap.language})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {/* --- END FIX --- */}

                        <div className="h-[500px] border border-gray-700 rounded-lg overflow-hidden">
                            <Editor
                                height="100%"
                                theme="vs-dark"
                                readOnly={true}
                                // --- FIX: Use activeSnapshotIdx and pass the correct language ---
                                language={session.codeSnapshots?.[activeSnapshotIdx]?.language || "javascript"}
                                value={session.codeSnapshots?.[activeSnapshotIdx]?.code || "// No code captured"}
                                options={{ readOnly: true }}
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar: Feedback & Notes */}
                <div className="space-y-6">
                    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                        <h3 className="text-lg font-bold text-white mb-4">Feedback</h3>
                        {session.feedback ? (
                            <div className="space-y-3">
                                {['communication', 'problemSolving', 'codeQuality', 'overall'].map((key) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className="font-bold">{session.feedback[key]}/5</span>
                                    </div>
                                ))}
                                
                                <div className="pt-4 border-t border-gray-800 mt-2">
                                    <span className="text-gray-400 text-sm">Comments</span>
                                    <p className="font-semibold text-white mt-1">{session.feedback.comments}</p>
                                </div>
                            </div>
                        ) : <p className="text-sm text-gray-600">No feedback yet.</p>}
                    </div>

                    {session.interviewerNotes && (
                        <div className="bg-purple-900/10 p-6 rounded-xl border border-purple-500/20">
                            <h3 className="text-lg font-bold text-purple-400 mb-2">Interviewer Notes</h3>
                            <p className="text-sm text-gray-300 italic">{session.interviewerNotes}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}