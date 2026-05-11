import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // ✅ FIX 1: Fetch user on mount to persist login across refreshes
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Call /users/me to get current logged-in user
                const response = await api.get('/users/me');
                setUser(response.data.data);
            } catch (error) {
                // Not logged in or token invalid
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const logout = async () => {
        try {
            await api.post('/users/logout');
            setUser(null);
        } catch (error) {
            console.error("Logout error:", error);
            // Force logout even if API fails
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};