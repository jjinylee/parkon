import { createContext, useContext, useState } from 'react';
import { getToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const saved = localStorage.getItem('user');
  const [user, setUser] = useState(saved ? JSON.parse(saved) : null);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const isLoggedIn = !!user;
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isPending = user?.status === 'pending';

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn, isAdmin, isPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
