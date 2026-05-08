import { createContext, useState } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    const logout = async () => {
        try {
            await api.post('/users/logout');
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};