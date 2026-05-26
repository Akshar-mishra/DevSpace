import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../services/api";

export default function SessionReview() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

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
            <div className="w-32 h-6 bg-gray-800 rounded mb-6"></div> {/* Back button placeholder */}
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
                        <h2 className="text-lg font-bold text-white mb-2">{session.room?.name}</h2>
                        <div className="h-[500px] border border-gray-700 rounded-lg overflow-hidden">
                            <Editor
                                height="100%"
                                theme="vs-dark"
                                readOnly={true}
                                value={session.codeSnapshots?.[0]?.code || "// No code captured"}
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
                                {/* Render only the number-based ratings */}
                                {['communication', 'problemSolving', 'codeQuality', 'overall'].map((key) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="capitalize text-gray-400">{key.replace(/([A-Z])/g, ' $1')}</span>
                                        <span className="font-bold">{session.feedback[key]}/5</span>
                                    </div>
                                ))}
                                
                                {/* Render the comments separately */}
                                <div className="pt-4 border-t border-gray-800 mt-2">
                                    <span className="text-gray-400 text-sm">Comments</span>
                                    <p className="font-semibold text-white mt-1">{session.feedback.comments}</p>
                                </div>
                            </div>
                        ) : <p className="text-sm text-gray-600">No feedback yet.</p>}
                    </div>

                    {/* Private Notes (Only visible to Interviewer) */}
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