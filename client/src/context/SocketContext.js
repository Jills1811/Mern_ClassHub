import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { user, token } = useAuth();

  useEffect(() => {
    if (token && user) {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
        auth: { token }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        newSocket.emit('join-classrooms');
      });

      // Handle notifications
      newSocket.on('new-assignment', (data) => {
        toast.info(data.message);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'assignment',
          message: data.message,
          timestamp: data.timestamp
        }]);
      });

      newSocket.on('assignment-submission', (data) => {
        toast.info(data.message);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'submission',
          message: data.message,
          timestamp: data.timestamp
        }]);
      });

      newSocket.on('assignment-graded', (data) => {
        toast.success(data.message);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'grade',
          message: data.message,
          grade: data.grade,
          timestamp: data.timestamp
        }]);
      });

      newSocket.on('new-announcement', (data) => {
        toast.info(`New announcement: ${data.announcement.title}`);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'announcement',
          message: data.message,
          timestamp: data.timestamp
        }]);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token, user]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider value={{
      socket,
      notifications,
      clearNotifications
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};