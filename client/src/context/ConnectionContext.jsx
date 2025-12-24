import React, { createContext, useContext, useState, useEffect } from 'react';

const ConnectionContext = createContext(null);

export const ConnectionProvider = ({ children }) => {
    const [status, setStatus] = useState('online'); // Always online for standalone
    const [lastSync, setLastSync] = useState(new Date());

    const refresh = () => {
        setLastSync(new Date());
        setStatus('online');
    };

    return (
        <ConnectionContext.Provider value={{
            status,
            lastSync,
            lastLocalAvailable: lastSync,
            lastCloudAvailable: lastSync,
            refresh
        }}>
            {children}
        </ConnectionContext.Provider>
    );
};

export const useConnection = () => {
    const context = useContext(ConnectionContext);
    if (!context) return { status: 'online', lastSync: new Date(), refresh: () => { } };
    return context;
};

export default ConnectionContext;
