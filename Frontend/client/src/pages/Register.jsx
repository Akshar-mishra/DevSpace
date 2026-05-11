import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
    const navigate = useNavigate();
    const { user, loading } = useContext(AuthContext);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Member'
    });
    const [error, setError] = useState('');
    const [formLoading, setFormLoading] = useState(false);

    // ✅ FIX 4: Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, loading, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormLoading(true);

        try {
            await api.post('/users/register', formData);
            // On success, redirect to login (user must log in)
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setFormLoading(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-900 text-white">Loading...</div>;
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-6">Join DevSpace</h2>
                
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4 text-center text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm mb-1">Full Name</label>
                        <input 
                            type="text" 
                            name="name" 
                            value={formData.name}
                            required 
                            onChange={handleChange} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            disabled={formLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Email</label>
                        <input 
                            type="email" 
                            name="email" 
                            value={formData.email}
                            required 
                            onChange={handleChange} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            disabled={formLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Password</label>
                        <input 
                            type="password" 
                            name="password" 
                            value={formData.password}
                            required 
                            minLength="6"
                            onChange={handleChange} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            disabled={formLoading}
                        />
                        <p className="text-gray-500 text-xs mt-1">Min 6 characters</p>
                    </div>
                    <div>
                        <label className="block text-sm mb-1">Account Type</label>
                        <select 
                            name="role" 
                            value={formData.role}
                            onChange={handleChange} 
                            className="w-full p-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                            disabled={formLoading}
                        >
                            <option value="Member">Candidate / Member</option>
                            <option value="Interviewer">Interviewer</option>
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        disabled={formLoading} 
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 p-2 rounded font-bold transition-colors disabled:cursor-not-allowed"
                    >
                        {formLoading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-400">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;