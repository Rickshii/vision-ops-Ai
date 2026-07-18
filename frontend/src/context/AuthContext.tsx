import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'suspended';
  avatarUrl?: string;
  phone?: string;
  company?: string;
  apiKey?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted session on app startup
    const persistedToken = localStorage.getItem('visionops_token');
    const persistedUser = localStorage.getItem('visionops_user');

    if (persistedToken && persistedUser) {
      setToken(persistedToken);
      setUser(JSON.parse(persistedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('visionops_token', newToken);
    localStorage.setItem('visionops_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('visionops_token');
    localStorage.removeItem('visionops_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('visionops_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshProfile = async () => {
    try {
      const response = await authApi.getProfile();
      updateUser(response.data);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
