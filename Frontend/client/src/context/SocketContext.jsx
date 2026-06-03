import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user) {
            const socketInstance = io(import.meta.env.VITE_BACKEND_URL, {withCredentials: true});
            socketInstance.on("connect", () => {
                console.log("🟢 Frontend Socket Connected:", socketInstance.id);
            });
            setSocket(socketInstance);

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
