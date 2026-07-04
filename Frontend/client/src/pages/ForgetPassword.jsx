import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

const ForgotPassword = () => {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [error, setError] = useState('')
    const [formLoading, setFormLoading] = useState(false)

    const handleSendOtp = async (e) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)
        try {
            await api.post('/users/forgot-password', { email })
            setStep(2)
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.')
        } finally {
            setFormLoading(false)
        }
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)
        try {
            const response = await api.post('/users/verify-otp', { email, otp })
            setResetToken(response.data.data.resetToken)
            setStep(3)
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP.')
        } finally {
            setFormLoading(false)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        setError('')
        setFormLoading(true)
        try {
            await api.post('/users/reset-password', { resetToken, newPassword })
            navigate('/login')
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong.')
        } finally {
            setFormLoading(false)
        }
    }

    return (
        <div 
            className="flex min-h-screen items-center justify-center bg-[#071318] p-4 overflow-hidden"
            style={{
                backgroundImage: `
                    radial-gradient(circle at 50% 40%, rgba(40, 165, 180, 0.65) 0%, transparent 80%),
                    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 24px)
                `
            }}
        >
            <div className="w-full max-w-sm bg-white/[0.15] p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-white/[0.3] backdrop-blur-[40px] overflow-y-auto max-h-[90vh] custom-scrollbar">
                <h2 className="text-2xl font-bold text-center text-slate-50 mb-8 tracking-wide">
                    {step === 1 && 'Reset Password'}
                    {step === 2 && 'Enter OTP'}
                    {step === 3 && 'New Password'}
                </h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-400/50 text-red-100 p-3 rounded-xl mb-6 text-center text-sm font-medium backdrop-blur-md shadow-sm">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-100 ml-1">Email</label>
                            <input 
                                type="email" name="email" id="email"
                                value={email} required onChange={(e) => setEmail(e.target.value)} disabled={formLoading}
                                className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                                placeholder="Enter your email" 
                            />
                        </div>
                        <button 
                            type="submit" disabled={formLoading} 
                            className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:bg-slate-600 disabled:opacity-60 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all duration-200 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(34,197,94,0.4)] mt-2 border border-green-300/50"
                        >
                            {formLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="otp" className="block text-sm font-medium text-slate-100 ml-1">OTP</label>
                            <input 
                                type="text" name="otp" id="otp"
                                value={otp} required onChange={(e) => setOtp(e.target.value)} disabled={formLoading}
                                className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                                placeholder="Enter 6-digit OTP" 
                            />
                        </div>
                        <button 
                            type="submit" disabled={formLoading} 
                            className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:bg-slate-600 disabled:opacity-60 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all duration-200 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(34,197,94,0.4)] mt-2 border border-green-300/50"
                        >
                            {formLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-100 ml-1">New Password</label>
                            <input 
                                type="password" name="newPassword" id="newPassword"
                                value={newPassword} required onChange={(e) => setNewPassword(e.target.value)} disabled={formLoading}
                                className="w-full p-3.5 bg-white/[0.08] rounded-xl border border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-green-400/80 focus:border-green-400/80 transition-all duration-300 text-slate-50 placeholder:text-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]"
                                placeholder="Enter new password" 
                            />
                        </div>
                        <button 
                            type="submit" disabled={formLoading} 
                            className="w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] disabled:bg-slate-600 disabled:opacity-60 p-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all duration-200 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(34,197,94,0.4)] mt-2 border border-green-300/50"
                        >
                            {formLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <p className="mt-8 text-center text-sm text-slate-200 font-medium">
                    <Link to="/login" className="text-green-300 hover:text-green-200 transition-colors font-bold tracking-wide">Back to Login</Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword