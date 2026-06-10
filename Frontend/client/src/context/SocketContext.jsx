import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('accessToken');
            console.log("🔵 Attempting to connect to socket at:", import.meta.env.VITE_BACKEND_URL);
            const socketInstance = io(import.meta.env.VITE_BACKEND_URL, {
                auth: {
                    token: token
                },
                withCredentials: true,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: 5
            });
            
            socketInstance.on("connect", () => {
                console.log("🟢 Frontend Socket Connected:", socketInstance.id);
            });

            socketInstance.on("connect_error", (error) => {
                console.error("❌ Socket Connection Error:", error);
            });

            socketInstance.on("disconnect", (reason) => {
                console.log("🔴 Frontend Socket Disconnected:", reason);
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
                console.log("🔴 Frontend Socket Cleanup");
            };
        }
    }, [user]); 
 
    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
