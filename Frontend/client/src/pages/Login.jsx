import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { setUser } = useContext(AuthContext); // Access global brain
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/users/login', formData);
            // 1. Update Global State
            setUser(response.data.data.user);
            // 2. Redirect to Dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-6">DevSpace Login</h2>
                
                {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4 text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm mb-1">Email</label>
                        <input type="email" name="email" required onChange={handleChange} className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Password</label>
                        <input type="password" name="password" required onChange={handleChange} className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500" />
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded font-bold transition-colors disabled:opacity-50">
                        {loading ? 'Authenticating...' : 'Login'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-400">
                    Don't have an account? <Link to="/register" className="text-blue-400 hover:underline">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;