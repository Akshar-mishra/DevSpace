import { useState, useContext, useEffect } from 'react'  
import { useNavigate, Link } from 'react-router-dom'  
import api from '../services/api'  
import { AuthContext } from '../context/AuthContext'  

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
            className="flex min-h-screen items-center justify-center bg-[#1e2532] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(74,222,128,0.35),rgba(30,37,50,1)_80%)] p-4 overflow-hidden"
        >
            {/* Removed overflow-y-auto, max-h-[90vh], and custom-scrollbar from this div */}
            <div className="w-full max-w-sm bg-white/[0.15] p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-white/[0.3] backdrop-blur-[40px]">
                <h2 className="text-2xl font-bold text-center text-slate-50 mb-8 tracking-wide">Join DevSpace</h2>
                
                {error && (
                    <div className="bg-red-500/20 border border-red-400/50 text-red-100 p-3 rounded-xl mb-6 text-center text-sm font-medium backdrop-blur-md shadow-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-100 ml-1">Full Name</label>
                        <input 
                            type="text" name="name" id="name"
                            value={formData.name} required onChange={handleChange} disabled={formLoading}
                            className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                            placeholder="John Doe"
                        />
                    </div>
 
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-100 ml-1">Email</label>
                        <input 
                            type="email" name="email" id="email"
                            value={formData.email} required onChange={handleChange} disabled={formLoading}
                            className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                            placeholder="john@example.com"
                        />
                    </div>
                    
                    <div className="space-y-2 relative">
                        <label htmlFor="password" className="block text-sm font-medium text-slate-100 ml-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                name="password" id="password"
                                value={formData.password} required minLength="6" onChange={handleChange} disabled={formLoading}
                                className="w-full p-3.5 pr-14 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                                placeholder="Min 6 characters"
                            />
                            <button 
                                type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white transition-colors p-1 text-xs font-bold tracking-wider"
                            >
                                {showPassword ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="role" className="block text-sm font-medium text-slate-100 ml-1">Account Type</label>
                        <select 
                            name="role" id="role"
                            value={formData.role} onChange={handleChange} disabled={formLoading}
                            className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 appearance-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                        >
                            <option value="Member" className="bg-[#1e2532]">Candidate / Member</option>
                            <option value="Interviewer" className="bg-[#1e2532]">Interviewer</option>
                        </select>
                    </div>

                    <button 
                        type="submit" disabled={formLoading} 
                        className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:bg-slate-600 disabled:opacity-60 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all duration-200 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(34,197,94,0.4)] mt-2 border border-green-300/50"
                    >
                        {formLoading ? 'Initializing Mission....' : 'Initialize Mission'}
                    </button>
                </form>
                
                <p className="mt-8 text-center text-sm text-slate-200 font-medium">
                    Already have an account? 
                    <Link to="/login" className="ml-1.5 text-green-300 hover:text-green-200 transition-colors font-bold tracking-wide shadow-green-500">Log In</Link>
                </p>
            </div>
        </div>
    )
}

export default Register