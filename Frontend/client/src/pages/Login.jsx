import { useState, useContext, useEffect } from 'react'  
import { useNavigate, Link } from 'react-router-dom'  
import api from '../services/api'  
import { AuthContext } from '../context/AuthContext'  
import Log from '../img/Log.webp'

const Login = () => {
    const navigate = useNavigate()  
    const { setUser, user, loading } = useContext(AuthContext)  
    const [formData, setFormData] = useState({ email: '', password: '' })  
    const [error, setError] = useState('')  
    const [formLoading, setFormLoading] = useState(false)  
    const [showPassword, setShowPassword] = useState(false)

    //Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            navigate('/dashboard', { replace: true })  
        }
    }, [user, loading, navigate])  

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })  
    }  

    const handleSubmit = async (e) => {
        e.preventDefault()  
        setError('')  
        setFormLoading(true)  
        try {
            const response = await api.post('/users/login', formData)  
            // Update global auth state
            setUser(response.data.data.user)  
            // Redirect to dashboard
            navigate('/dashboard')  
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid access credentials.')  
        } finally {
            setFormLoading(false)  
        }
    }  

    

    return (
        <div 
            className="flex h-screen items-center justify-center bg-zinc-950 text-white p-4"
            style={{ 
                backgroundImage: `url(${Log})`,
                backgroundSize: "cover", 
                backgroundPosition: "center" 
            }}
        >
           <div className="w-full max-w-sm bg-black/30 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-lg overflow-y-auto max-h-[90vh] custom-scrollbar">
                <h2 className="text-3xl font-extrabold text-center text-zinc-100 mb-8 tracking-tight">Login to DevSpace</h2>

                {error && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-300 p-3 rounded-lg mb-6 text-center text-sm font-medium backdrop-blur-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-semibold text-zinc-300">Email</label>
                        <input 
                            type="email" name="email" id="email"
                            value={formData.email} required onChange={handleChange} disabled={formLoading}
                            className="w-full p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 placeholder:text-zinc-600"
                            placeholder="Enter your email" 
                        />
                    </div>
                    
                    <div className="space-y-2 relative">
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                name="password" id="password"
                                value={formData.password} required onChange={handleChange} disabled={formLoading}
                                className="w-full p-3.5 pr-12 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 placeholder:text-zinc-600"
                                placeholder="Enter your password"
                            />
                            <button 
                                type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition p-1 text-xs font-bold"
                            >
                                {showPassword ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium px-1.5 pt-1">
                            <label htmlFor="password" className="text-zinc-400">Password</label>
                            <button type="button" className="text-zinc-400 hover:text-zinc-200 transition">Forgot ?</button>
                        </div>
                    </div>

                    <button 
                        type="submit" disabled={formLoading} 
                        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800/50 disabled:opacity-70 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all disabled:cursor-not-allowed shadow-md"
                    >
                        {formLoading ? 'Authenticating...' : 'Dock In'}
                    </button>
                </form>
                
                <p className="mt-8 text-center text-sm text-zinc-400 font-medium">
                    Don't Have An Account? 
                    <Link to="/register" className="ml-1.5 text-zinc-50 hover:text-white transition font-bold">Register</Link>
                </p>
            </div>
        </div>
    )
}

export default Login 