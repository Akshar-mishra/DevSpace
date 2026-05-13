import { useEffect, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { setupAxiosInterceptors } from './services/setupAxios';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';

function App() {
    const { setUser } = useContext(AuthContext);

    // Setup axios interceptor for token refresh
    useEffect(() => {
        setupAxiosInterceptors(setUser);
    }, [setUser]);

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route 
                path="/dashboard" 
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } 
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

            <Route path="/room/:roomId" element={<ProtectedRoute> <Room /></ProtectedRoute>} />
        </Routes>
    );
}

export default App;
