import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);

    useEffect(() => {

        if (user) {
            // io() creates a new connection to the backend.
            const socketInstance = io(import.meta.env.VITE_BACKEND_URL, {withCredentials: true});

            socketInstance.on("connect", () => {
                console.log("🟢 Frontend Socket Connected:", socketInstance.id);
            });

            // 2. SAVE STATE: We put the open connection into React's memory
            // so other components can use it.
            setSocket(socketInstance);

            // 3. CLEANUP: When the user logs out (user becomes null),runs return function.
            // This hangs up the phone line. If you don't do this, your server crashes from ghost connections.
            return () => {
                socketInstance.disconnect();
                console.log("🔴 Frontend Socket Disconnected");
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
