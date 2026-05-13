import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    // We grab the user from the AuthContext you just showed me
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Only run this if the user is actually logged in
        if (user) {
            
            // 1. INITIALIZE: This opens the "phone line" to the backend.
            // withCredentials: true is MANDATORY so your browser sends the secure cookie.
            const socketInstance = io(import.meta.env.VITE_BACKEND_URL, { 
                withCredentials: true 
            });
            
            // (Optional Debugging: So you can see it connect in your browser console)
            socketInstance.on("connect", () => {
                console.log("🟢 Frontend Socket Connected:", socketInstance.id);
            });

            // 2. SAVE STATE: We put the open connection into React's memory
            // so other components can use it.
            setSocket(socketInstance);

            // 3. CLEANUP: When the user logs out (user becomes null), React runs this return function.
            // This hangs up the phone line. If you don't do this, your server crashes from ghost connections.
            return () => {
                socketInstance.disconnect();
                console.log("🔴 Frontend Socket Disconnected");
            };
        }
    }, [user]); // The dependency array: run this logic every time 'user' changes.

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
