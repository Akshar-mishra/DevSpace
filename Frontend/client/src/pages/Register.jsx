import { useState, useContext, useEffect } from 'react'  
import { useNavigate, Link } from 'react-router-dom'  
import api from '../services/api'  
import { AuthContext } from '../context/AuthContext'  
import Log from '../img/Log.webp' 

const Register = () => {
    const navigate = useNavigate()  
    const { user, loading } = useContext(AuthContext)  
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Member'
    })  
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
            await api.post('/users/register', formData)  
            // On success, redirect to login
            navigate('/login')  
        } catch (err) {
            setError(err.response?.data?.message || 'Connection to mission control failed.')  
        } finally {
            setFormLoading(false)  
        }
    }  


    return (
        <div 
            className="flex h-screen items-center justify-center bg-zinc-950 text-white p-4 overflow-hidden"
            style={{ 
                backgroundImage: `url(${Log})`,
                backgroundSize: "cover", 
                backgroundPosition: "center" 
            }}
 >
            <div className="w-full max-w-sm bg-black/30 p-8 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-lg overflow-y-auto max-h-[90vh] custom-scrollbar">
                <h2 className="text-3xl font-extrabold text-center text-zinc-100 mb-6 tracking-tight">Join DevSpace</h2>
                

                {error && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-300 p-3 rounded-lg mb-5 text-center text-sm font-medium backdrop-blur-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label htmlFor="name" className="block text-sm font-semibold text-zinc-300">Full Name</label>
                        <input 
                            type="text" name="name" id="name"
                            value={formData.name} required onChange={handleChange} disabled={formLoading}
                            className="w-full p-3 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 placeholder:text-zinc-600"
                            placeholder="John Doe"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="email" className="block text-sm font-semibold text-zinc-300">Email</label>
                        <input 
                            type="email" name="email" id="email"
                            value={formData.email} required onChange={handleChange} disabled={formLoading}
                            className="w-full p-3 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 placeholder:text-zinc-600"
                            placeholder="john@example.com"
                        />
                    </div>
                    
                    <div className="space-y-1.5 relative">
                        <label htmlFor="password" className="block text-sm font-semibold text-zinc-300">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" id="password"
                                value={formData.password} required minLength="6" onChange={handleChange} disabled={formLoading}
                                className="w-full p-3 pr-12 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 placeholder:text-zinc-600"
                                placeholder="Min 6 characters"
                            />
                            <button 
                                type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition p-1 text-xs font-bold"
                            >
                                {showPassword ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="role" className="block text-sm font-semibold text-zinc-300">Account Type</label>
                        <select 
                            name="role" id="role"
                            value={formData.role} onChange={handleChange} disabled={formLoading}
                            className="w-full p-3 bg-zinc-900/80 rounded-xl border border-zinc-700/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-600 transition text-zinc-50 appearance-none cursor-pointer"
                        >
                            <option value="Member" className="bg-zinc-900">Candidate / Member</option>
                            <option value="Interviewer" className="bg-zinc-900">Interviewer</option>
                        </select>
                    </div>

                    <button 
                        type="submit" disabled={formLoading} 
                        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800/50 disabled:opacity-70 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all disabled:cursor-not-allowed shadow-md mt-2"
                    >
                        {formLoading ? 'Initializing Mission....' : 'Initialize Mission'}
                    </button>
                </form>
                
                <p className="mt-6 text-center text-sm text-zinc-400 font-medium">
                    Already have an account? 
                    <Link to="/login" className="ml-1.5 text-zinc-50 hover:text-white transition font-bold">Log In</Link>
                </p>
            </div>
        </div>
    )
}

export default Register  