import { useState } from "react";

export default function FeedbackModal({ isOpen, onSubmit, isSubmitting }) {
    const [form, setForm] = useState({
        communication: 5,
        problemSolving: 5,
        codeQuality: 5,
        overall: 5,
        comments: ""
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target

        // ratings are numbers, comments stay as string
        if (name === "comments") {
            setForm(prev => ({ ...prev, comments: value }))
        } else {
            setForm(prev => ({ ...prev, [name]: Number(value) }))
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
                <div className="bg-purple-900/20 px-6 py-4 border-b border-purple-500/20">
                    <h2 className="text-xl font-bold text-purple-400">📝 Session Evaluation</h2>
                    <p className="text-xs text-gray-400 mt-1">Please rate the candidate's performance.</p>
                </div>

                <div className="p-6 space-y-5">
                    {["communication", "problemSolving", "codeQuality", "overall"].map((metric) => (
                        <div key={metric} className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-300 capitalize">
                                {metric.replace(/([A-Z])/g, ' $1').trim()}
                            </label>
                            <select 
                                name={metric} 
                                value={form[metric]} 
                                onChange={handleChange}
                                disabled={isSubmitting}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
                            >
                                {[1, 2, 3, 4, 5].map(num => (
                                    <option key={num} value={num}>{num} - {num === 5 ? 'Excellent' : num === 1 ? 'Poor' : 'Avg'}</option>
                                ))}
                            </select>
                        </div>
                    ))}

                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-semibold text-gray-300">Final Comments</label>
                        <textarea 
                            name="comments"
                            value={form.comments}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required
                            placeholder="Write a brief summary of the candidate's performance..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 resize-none h-24"
                        />
                    </div>

                    <button 
                        onClick={() => onSubmit(form)}
                        disabled={isSubmitting || !form.comments.trim()}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white shadow-lg transition-all"
                    >
                        {isSubmitting ? "Submitting..." : "Submit Evaluation & Exit"}
                    </button>
                </div>
            </div>
        </div>
    );
} 