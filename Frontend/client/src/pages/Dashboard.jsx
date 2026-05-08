import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-blue-400">DevSpace</h1>
                        <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-gray-700 text-sm rounded-full border border-gray-600">
                            Role: {user?.role}
                        </span>
                        <button 
                            onClick={handleLogout}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Placeholder for Phase 2: Rooms */}
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-xl font-bold mb-4">My Rooms</h2>
                        <p className="text-gray-400 text-sm">Room integration coming in Phase 2...</p>
                    </div>
                    
                    {/* Placeholder for Phase 5: Friends/History */}
                    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                        <h2 className="text-xl font-bold mb-4">Activity</h2>
                        <p className="text-gray-400 text-sm">History and stats coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;