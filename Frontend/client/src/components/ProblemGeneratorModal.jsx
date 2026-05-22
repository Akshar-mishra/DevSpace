import { useState } from "react";
import { generateProblem } from "../services/problem.service";

export default function ProblemGeneratorModal({ 
    isOpen, 
    onClose, 
    onProblemGenerated, 
    socket, 
    roomId 
}) {
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setError("Problem name cannot be empty");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Call backend to generate problem via Gemini
            const apiResponse = await generateProblem(trimmed);
            
            if (!apiResponse.data || !apiResponse.data._id) {
                throw new Error("Invalid response from server");
            }

            const problemId = apiResponse.data._id;

            // Emit via Socket.io to sync problem across room
            socket.emit("problem-generated", { roomId, problemId });

            // Clear and close
            setInputValue("");
            onProblemGenerated?.();
            onClose();
        } catch (err) {
            const msg = 
                err.response?.data?.message || 
                err.message || 
                "Failed to generate problem";
            setError(msg);
            console.error("Problem generation error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !loading && inputValue.trim()) {
            handleGenerate();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 w-96 shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">✨</span>
                    <h2 className="text-lg font-bold text-white">Generate Problem</h2>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4">
                    Type a topic or algorithm name. Our AI will generate a complete problem with test cases.
                </p>

                {/* Input */}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="e.g., Two Sum, Binary Search, Linked List Reversal"
                    disabled={loading}
                    autoFocus
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50 text-sm"
                />

                {/* Error Message */}
                {error && (
                    <div className="mt-3 p-3 bg-red-900/30 border border-red-900 rounded-lg text-red-400 text-sm">
                        <span className="font-semibold">Error: </span>{error}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="mt-3 p-3 bg-blue-900/20 border border-blue-900 rounded-lg text-blue-400 text-sm flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Generating problem with AI... This may take a few seconds.
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !inputValue.trim()}
                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-lg text-white font-bold transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed text-sm"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Generate"
                        )}
                    </button>
                </div>

                {/* Hint */}
                <p className="mt-4 text-xs text-gray-600 text-center">
                    Press Enter to generate quickly
                </p>
            </div>
        </div>
    );
}